import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ClinicService, FiscalCounterparty, FiscalDocument, FiscalDocumentDraft, ServiceResolutionContext } from '../types/clinicErp';
import { addTransaction } from './userDataService';
import { saveInventoryItem } from './inventoryService';
import { saveAssetItem } from './assetService';
import { extractTextFromPDF } from './pdfUtils';

const text = (root: Document | Element, tag: string) => root.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
const number = (value?: string) => Number(String(value || '0').replace(',', '.')) || 0;
const normalizeCnpj = (value?: string | null) => String(value || '').replace(/\D/g, '');

const readNodeCnpj = (node?: Element | null) =>
  normalizeCnpj(
    node?.getElementsByTagName('CNPJ')[0]?.textContent ||
    node?.getElementsByTagName('Cnpj')[0]?.textContent ||
    node?.getElementsByTagName('CpfCnpj')[0]?.textContent
  );

const readNodeName = (node?: Element | null) =>
  node?.getElementsByTagName('xNome')[0]?.textContent?.trim() ||
  node?.getElementsByTagName('RazaoSocial')[0]?.textContent?.trim() ||
  node?.getElementsByTagName('NomeRazaoSocial')[0]?.textContent?.trim() ||
  node?.getElementsByTagName('Nome')[0]?.textContent?.trim() ||
  '';

export const detectXmlFinancialDirection = (
  xml: string,
  clinicCnpjs: string[]
): 'income' | 'expense' | 'review' => {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  if (parsed.querySelector('parsererror')) return 'review';

  const ownedCnpjs = clinicCnpjs.map(normalizeCnpj).filter(Boolean);
  const isOwned = (cnpj?: string) => {
    const normalized = normalizeCnpj(cnpj);
    return !!normalized && ownedCnpjs.includes(normalized);
  };

  const tpNF = text(parsed, 'tpNF');
  const issuerNode = parsed.getElementsByTagName('emit')[0] || parsed.getElementsByTagName('PrestadorServico')[0];
  const recipientNode = parsed.getElementsByTagName('dest')[0] || parsed.getElementsByTagName('TomadorServico')[0];
  const issuerCnpj = readNodeCnpj(issuerNode);
  const recipientCnpj = readNodeCnpj(recipientNode);

  if (isOwned(issuerCnpj)) return 'income';
  if (isOwned(recipientCnpj)) return 'expense';
  if (tpNF === '1') return 'income';
  if (tpNF === '0') return 'expense';

  return 'review';
};

export const getClinicServices = async (managerId: string): Promise<ClinicService[]> => {
  const snapshot = await getDocs(query(collection(db, 'users', managerId, 'service_catalog'), orderBy('name')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as ClinicService));
};

export const saveClinicService = async (managerId: string, service: Omit<ClinicService, 'id' | 'createdAt' | 'updatedAt'>) => {
  const reference = await addDoc(collection(db, 'users', managerId, 'service_catalog'), {
    ...service,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return reference.id;
};

export const updateClinicService = async (
  managerId: string,
  serviceId: string,
  service: Omit<ClinicService, 'id' | 'createdAt' | 'updatedAt'>
) => {
  await updateDoc(doc(db, 'users', managerId, 'service_catalog', serviceId), {
    ...service,
    updatedAt: serverTimestamp()
  });
};

export const deleteClinicService = async (managerId: string, serviceId: string) => {
  await deleteDoc(doc(db, 'users', managerId, 'service_catalog', serviceId));
};

const isRuleEffective = (service: ClinicService, date?: string) => {
  if (!date) return true;
  if (service.effectiveFrom && service.effectiveFrom > date) return false;
  if (service.effectiveTo && service.effectiveTo < date) return false;
  return true;
};

const scoreServiceRule = (service: ClinicService, context: ServiceResolutionContext) => {
  let score = 0;
  if (service.professionalId && service.professionalId === context.professionalId) score += 8;
  if (service.contractName && service.contractName === context.contractName) score += 6;
  if (service.unitName && service.unitName === context.unitName) score += 4;
  if (service.specialty && service.specialty === context.specialty) score += 2;
  if (!service.professionalId) score += 1;
  return score;
};

export const resolveClinicServicePrice = async (
  managerId: string,
  serviceId: string,
  context: ServiceResolutionContext
): Promise<ClinicService | null> => {
  const services = await getClinicServices(managerId);
  const baseService = services.find(item => item.id === serviceId && item.active);
  if (!baseService) return null;

  const candidates = services.filter(item =>
    item.active &&
    item.payer === context.payer &&
    item.code === baseService.code &&
    item.name === baseService.name &&
    isRuleEffective(item, context.date)
  );

  return candidates
    .sort((left, right) => scoreServiceRule(right, context) - scoreServiceRule(left, context))[0] || baseService;
};

export const parseFiscalXml = (xml: string, originalFileName: string): FiscalDocumentDraft => {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  if (parsed.querySelector('parsererror')) throw new Error('O arquivo não possui um XML fiscal válido.');

  const infNfe = parsed.getElementsByTagName('infNFe')[0] || parsed.getElementsByTagName('infCte')[0] || parsed.documentElement;
  const issuer = parsed.getElementsByTagName('emit')[0] || parsed.getElementsByTagName('PrestadorServico')[0];
  const recipient = parsed.getElementsByTagName('dest')[0] || parsed.getElementsByTagName('TomadorServico')[0];
  const items = Array.from(parsed.getElementsByTagName('det')).map(detail => {
    const product = detail.getElementsByTagName('prod')[0] || detail;
    return {
      description: text(product, 'xProd') || text(product, 'xServ') || 'Item sem descrição',
      code: text(product, 'cProd'),
      ncm: text(product, 'NCM'),
      cfop: text(product, 'CFOP'),
      quantity: number(text(product, 'qCom')),
      unitValue: number(text(product, 'vUnCom')),
      totalValue: number(text(product, 'vProd')) || number(text(product, 'vItem'))
    };
  });

  const total = number(text(parsed, 'vNF')) || number(text(parsed, 'vPrest')) || items.reduce((sum, item) => sum + item.totalValue, 0);
  const issueDate = text(parsed, 'dhEmi') || text(parsed, 'dEmi') || text(parsed, 'DataEmissao');

  return {
    documentType: text(parsed, 'mod') === '57' ? 'CT-e' : text(parsed, 'mod') === '65' ? 'NFC-e' : text(parsed, 'mod') === '55' ? 'NF-e' : 'Documento fiscal XML',
    accessKey: infNfe.getAttribute('Id')?.replace(/^NFe|^CTe/, ''),
    issuerName: readNodeName(issuer) || undefined,
    issuerCnpj: readNodeCnpj(issuer) || undefined,
    recipientName: readNodeName(recipient) || undefined,
    recipientCnpj: readNodeCnpj(recipient) || undefined,
    number: text(parsed, 'nNF') || text(parsed, 'nCT'),
    series: text(parsed, 'serie'),
    issuedAt: issueDate ? issueDate.slice(0, 10) : undefined,
    totalValue: total,
    items,
    originalFileName,
    sourceFormat: 'xml',
    extractionConfidence: 'high'
  };
};

const parseBrazilianAmount = (value?: string) => {
  const normalized = String(value || '').replace(/[^\d,.-]/g, '');
  if (!normalized) return 0;
  return normalized.includes(',')
    ? Number(normalized.replace(/\./g, '').replace(',', '.')) || 0
    : Number(normalized) || 0;
};

const firstMatch = (content: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return '';
};

export const parseFiscalPdf = async (file: File): Promise<FiscalDocumentDraft> => {
  const content = (await extractTextFromPDF(file)).replace(/\s+/g, ' ').trim();
  if (!content) throw new Error('O PDF não possui texto pesquisável. Confira se o arquivo não é apenas uma imagem.');

  const taxIds = Array.from(content.matchAll(/(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g))
    .map(match => normalizeCnpj(match[0]));
  const totalText = firstMatch(content, [
    /valor\s+(?:total|da\s+nota|dos\s+serviços)\s*:?\s*R?\$?\s*([\d.]+,\d{2})/i,
    /total\s+(?:da\s+nf(?:s-e)?|do\s+documento)?\s*:?\s*R?\$?\s*([\d.]+,\d{2})/i
  ]);
  const issuedAtText = firstMatch(content, [
    /(?:data\s+de\s+emissão|emissão)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /(\d{2}\/\d{2}\/\d{4})/
  ]);
  const numberText = firstMatch(content, [/(?:número|n[º°o]\.?)\s*(?:da\s+nota)?\s*:?\s*(\d{1,20})/i]);
  const issuerName = firstMatch(content, [
    /(?:prestador(?:\s+de\s+serviços)?|emitente|razão\s+social)\s*:?\s*([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9 .&/-]{3,100}?)(?=\s+(?:cnpj|cpf|inscrição|endereço|tomador))/i
  ]);
  const recipientName = firstMatch(content, [
    /(?:tomador(?:\s+de\s+serviços)?|destinatário)\s*:?\s*([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9 .&/-]{3,100}?)(?=\s+(?:cnpj|cpf|inscrição|endereço))/i
  ]);
  const issuedAt = issuedAtText ? issuedAtText.split('/').reverse().join('-') : new Date().toISOString().slice(0, 10);
  const totalValue = parseBrazilianAmount(totalText);
  const documentFingerprint = [taxIds[0] || '', taxIds[1] || '', numberText, issuedAt, totalValue.toFixed(2)].join('|');

  return {
    documentType: 'Documento fiscal PDF',
    issuerName: issuerName || undefined,
    issuerCnpj: taxIds[0] || undefined,
    recipientName: recipientName || undefined,
    recipientCnpj: taxIds[1] || undefined,
    number: numberText || undefined,
    issuedAt,
    totalValue,
    items: [],
    originalFileName: file.name,
    sourceFormat: 'pdf',
    documentFingerprint,
    extractionConfidence: totalValue > 0 && taxIds.length > 0 ? 'medium' : 'low',
    suggestedEntryType: 'review'
  };
};

export const getFiscalCounterparties = async (managerId: string): Promise<FiscalCounterparty[]> => {
  const snapshot = await getDocs(collection(db, 'users', managerId, 'fiscal_counterparties'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as FiscalCounterparty))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};

const counterpartyId = (taxId: string | undefined, name: string) => {
  const normalizedTaxId = normalizeCnpj(taxId);
  if (normalizedTaxId) return normalizedTaxId;
  return name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').slice(0, 120);
};

const upsertFiscalCounterparty = async (
  managerId: string,
  documentId: string,
  name: string | undefined,
  taxId: string | undefined,
  role: 'customer' | 'supplier',
  totalValue: number,
  issuedAt: string | undefined,
  clinicContext?: { clinicId?: string; unitName?: string }
) => {
  if (!name && !taxId) return;
  const id = counterpartyId(taxId, name || 'Não identificado');
  const reference = doc(db, 'users', managerId, 'fiscal_counterparties', id);
  const current = await getDoc(reference);
  const currentData = current.data();
  const currentRoles = (currentData?.roles || []) as Array<'customer' | 'supplier'>;
  await setDoc(reference, {
    name: name || currentData?.name || 'Não identificado',
    taxId: normalizeCnpj(taxId) || currentData?.taxId || '',
    roles: Array.from(new Set([...currentRoles, role])),
    documentCount: increment(1),
    totalValue: increment(totalValue || 0),
    lastDocumentAt: issuedAt || new Date().toISOString().slice(0, 10),
    lastDocumentId: documentId,
    clinicId: clinicContext?.clinicId || '',
    unitName: clinicContext?.unitName || '',
    createdAt: current.exists() ? currentData?.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const indexFiscalCounterpartiesFromDraft = async (
  managerId: string,
  documentId: string,
  draft: FiscalDocumentDraft,
  direction: 'income' | 'expense' | 'review' = draft.suggestedEntryType || 'review',
  clinicContext?: { clinicId?: string; unitName?: string }
) => {
  if (direction === 'income') {
    await upsertFiscalCounterparty(managerId, documentId, draft.recipientName, draft.recipientCnpj, 'customer', draft.totalValue, draft.issuedAt, clinicContext);
    return;
  }

  await upsertFiscalCounterparty(managerId, documentId, draft.issuerName, draft.issuerCnpj, 'supplier', draft.totalValue, draft.issuedAt, clinicContext);
  if (direction === 'review' && draft.recipientName && draft.recipientCnpj) {
    await upsertFiscalCounterparty(managerId, documentId, draft.recipientName, draft.recipientCnpj, 'customer', draft.totalValue, draft.issuedAt, clinicContext);
  }
};

export const syncFiscalCounterparties = async (managerId: string) => {
  const snapshot = await getDocs(collection(db, 'users', managerId, 'fiscal_documents'));
  for (const item of snapshot.docs) {
    const data = item.data() as FiscalDocument & { counterpartiesIndexedAt?: unknown };
    if (data.counterpartiesIndexedAt) continue;
    await indexFiscalCounterpartiesFromDraft(
      managerId,
      item.id,
      data,
      data.suggestedEntryType || 'review',
      { clinicId: data.clinicId, unitName: data.unitName }
    );
    await updateDoc(item.ref, { counterpartiesIndexedAt: serverTimestamp() });
  }
};

export const saveFiscalDocument = async (
  managerId: string,
  importedBy: string,
  draft: FiscalDocumentDraft,
  classification: FiscalDocument['classification'],
  costCenter: string,
  clinicContext?: { clinicId?: string; unitName?: string }
) => {
  const duplicate = await getDocs(collection(db, 'users', managerId, 'fiscal_documents'));
  if (duplicate.docs.some(item =>
    (draft.accessKey && item.data().accessKey === draft.accessKey) ||
    (draft.documentFingerprint && item.data().documentFingerprint === draft.documentFingerprint)
  )) {
    throw new Error('Este XML já foi importado para a clínica.');
  }

  const reference = await addDoc(collection(db, 'users', managerId, 'fiscal_documents'), {
    ...draft,
    classification,
    costCenter,
    status: 'reviewed',
    importedBy,
    importedAt: serverTimestamp()
  });

  await indexFiscalCounterpartiesFromDraft(managerId, reference.id, draft, draft.suggestedEntryType || 'review', clinicContext);
  await updateDoc(reference, { counterpartiesIndexedAt: serverTimestamp() });

  await addTransaction(managerId, {
    date: draft.issuedAt || new Date().toISOString().slice(0, 10),
    description: `${draft.documentType}${draft.number ? ` ${draft.number}` : ''} · ${draft.issuerName || 'Fornecedor não identificado'}`,
    category: classification === 'tax' ? 'Impostos' : classification === 'inventory' ? 'Estoque' : classification === 'asset' ? 'Patrimônio' : costCenter,
    amount: draft.totalValue,
    type: 'expense',
    status: 'pending',
    sourceFiscalDocumentId: reference.id,
    sourceType: 'fiscal_import',
    clinicId: clinicContext?.clinicId,
    unitName: clinicContext?.unitName
  });

  if (classification === 'inventory') {
    for (const item of draft.items) {
      await saveInventoryItem(managerId, {
        name: item.description,
        category: 'supply',
        unit: 'un',
        quantity: item.quantity || 1,
        minimumQuantity: 0,
        averageCost: item.quantity ? item.totalValue / item.quantity : item.totalValue,
        active: true
      });
    }
  }

  if (classification === 'asset') {
    for (const item of draft.items) {
      await saveAssetItem(managerId, {
        name: item.description,
        category: 'equipment',
        acquisitionDate: draft.issuedAt || new Date().toISOString().slice(0, 10),
        acquisitionValue: item.totalValue,
        usefulLifeMonths: 60,
        supplierName: draft.issuerName,
        sourceFiscalDocumentId: reference.id,
        status: 'active',
        createdBy: importedBy
      });
    }
  }

  return reference.id;
};
