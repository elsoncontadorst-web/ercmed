import { addAppointment, updateAppointment } from './healthService';
import { getClinicServices, resolveClinicServicePrice } from './clinicErpService';
import { addTransaction } from './userDataService';
import { processBilling } from './repasseService';
import { getManagerIdForUser } from './accessControlService';
import { consumeInventoryItems } from './inventoryService';
import { registerAuditEvent } from './auditService';
import { consumeCarePackageSession, ensureCarePackageBalance } from './carePackageService';
import { Professional } from '../types/finance';
import { ServicePayer } from '../types/clinicErp';

export interface ProductionEntry {
  userId: string;
  professional: Professional;
  clinicId?: string;
  patientId?: string;
  patientName: string;
  serviceId: string;
  date: string;
  time: string;
  payer: ServicePayer;
  paymentStatus: 'pending' | 'received';
  attendanceKind?: 'standard' | 'package' | 'return_free';
  contractName?: string;
  unitName?: string;
  materialsUsed?: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  packageName?: string;
  packageTotalSessions?: number;
  notes?: string;
}

export const registerProductionEntry = async (entry: ProductionEntry) => {
  const managerId = (await getManagerIdForUser(entry.userId)) || entry.userId;
  const services = await getClinicServices(managerId);
  const requestedService = services.find(item => item.id === entry.serviceId && item.active);
  const service = await resolveClinicServicePrice(managerId, entry.serviceId, {
    payer: entry.payer,
    date: entry.date,
    professionalId: entry.professional.id,
    specialty: entry.professional.specialty,
    contractName: entry.contractName,
    unitName: entry.unitName
  });
  if (!requestedService || !service) throw new Error('Serviço ativo não encontrado na tabela de preços.');
  if (service.payer !== entry.payer) throw new Error('O serviço selecionado não corresponde ao pagador informado.');

  const taxPercentage = entry.professional.repasseConfig?.taxRate || 0;
  const repassePercentage = entry.professional.repasseConfig?.splitPercentage || 0;
  const attendanceKind = entry.attendanceKind || 'standard';
  const normalizedServiceCategory = String(requestedService.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const revenueUnit: 'clinical' | 'laboratory' = /laborator|exame|analise clinica/.test(normalizedServiceCategory)
    ? 'laboratory'
    : 'clinical';
  const grossAmount = attendanceKind === 'standard' ? service.grossPrice : 0;
  const taxAmount = grossAmount * taxPercentage / 100;
  const repasseAmount = (grossAmount - taxAmount) * repassePercentage / 100;
  const clinicAmount = grossAmount - taxAmount - repasseAmount;
  const appointmentOwnerId = entry.professional.userId || entry.userId;
  let packageBalanceId: string | undefined;

  if (attendanceKind === 'package') {
    const packageBalance = await ensureCarePackageBalance(managerId, {
      patientId: entry.patientId,
      patientName: entry.patientName.trim(),
      professionalId: entry.professional.id,
      professionalName: entry.professional.name,
      serviceId: service.id,
      serviceName: service.name,
      packageName: entry.packageName?.trim() || `${service.name} · pacote`,
      totalSessions: Math.max(1, entry.packageTotalSessions || 10),
      contractName: entry.contractName,
      unitName: entry.unitName,
      createdBy: entry.userId
    });
    const consumedPackage = await consumeCarePackageSession(managerId, packageBalance.id, entry.date);
    packageBalanceId = consumedPackage.id;
  }

  const appointmentId = await addAppointment(appointmentOwnerId, {
    patientId: entry.patientId,
    patientName: entry.patientName.trim(),
    professionalId: entry.professional.id,
    professionalName: entry.professional.name,
    specialty: entry.professional.specialty,
    date: entry.date,
    time: entry.time,
    status: 'completed',
    notes: entry.notes,
    amount: grossAmount,
    serviceId: service.id,
    serviceName: service.name,
    payer: entry.payer,
    packageBalanceId,
    registeredBy: entry.userId,
    attendanceKind,
    packageSessionUsed: attendanceKind === 'package',
    materialsUsed: entry.materialsUsed || []
  });
  if (!appointmentId) throw new Error('Não foi possível registrar o atendimento.');

  const billingId = await processBilling({
    professionalId: entry.professional.id,
    professionalName: entry.professional.name,
    professionalUserId: entry.professional.userId,
    managerId,
    patientName: entry.patientName.trim(),
    consultationDate: entry.date,
    serviceId: service.id,
    serviceName: service.name,
    unitName: entry.unitName,
    sourceAppointmentId: appointmentId,
    registeredBy: entry.userId,
    grossAmount,
    taxPercentage,
    repassePercentage,
    taxAmount,
    repasseAmount,
    clinicAmount,
    paymentMethod: entry.payer === 'insurance' ? 'insurance' : 'private',
    paymentStatus: attendanceKind === 'return_free' ? 'received' : entry.paymentStatus,
    paymentDate: attendanceKind === 'return_free' || entry.paymentStatus === 'received' ? entry.date : undefined,
    attendanceKind,
    revenueUnit,
    notes: entry.notes
  });
  if (!billingId) throw new Error('Atendimento salvo, mas o faturamento não pôde ser gerado.');

  let transactionId: string | null = null;
  if (attendanceKind !== 'package' || grossAmount > 0) {
    transactionId = await addTransaction(managerId, {
      date: entry.date,
      dueDate: entry.date,
      description: `${service.name} · ${entry.patientName.trim()} · ${entry.professional.name}`,
      category: entry.payer === 'insurance' ? 'Convênios' : attendanceKind === 'return_free' ? 'Produção sem receita' : 'Receita de serviços',
      amount: grossAmount,
      type: 'income',
      status: attendanceKind === 'return_free' || entry.paymentStatus === 'received' ? 'paid' : 'pending',
      sourceBillingId: billingId,
      sourceType: 'production_entry',
      sourceAppointmentId: appointmentId,
      attendanceKind,
      revenueUnit,
      clinicId: entry.clinicId,
      unitName: entry.unitName
    });
  }

  if (entry.materialsUsed?.length) {
    await consumeInventoryItems(managerId, appointmentId, entry.userId, entry.materialsUsed);
  }

  await updateAppointment(appointmentOwnerId, appointmentId, { billingId });
  await registerAuditEvent({
    managerId,
    userId: entry.userId,
    action: 'production_registered',
    origin: 'professional_portal',
    entityType: 'appointment',
    entityId: appointmentId,
    reason: attendanceKind,
    payload: {
      billingId,
      packageBalanceId,
      serviceId: service.id,
      grossAmount,
      payer: entry.payer
    }
  });
  return { appointmentId, billingId, transactionId, packageBalanceId, service, grossAmount, repasseAmount, clinicAmount };
};
