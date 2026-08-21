import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Download,
  FileCheck2,
  FileUp,
  FileKey2,
  History,
  Loader2,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  TestTube2,
  Trash2,
  UserRound,
} from "lucide-react";
import { getClinics } from "../../services/clinicService";
import { getAllPatients } from "../../services/healthService";
import { auth } from "../../services/firebase";
import { getManagerIdForUser } from "../../services/accessControlService";
import { getDelegatedCompanyContext, setDelegatedCompanyContext } from "../../services/delegatedCompanyContext";
import { getTransactions, syncTransactions } from "../../services/userDataService";
import { getAccountantLinks } from "../../services/accountantService";
import { useUser } from "../../contexts/UserContext";
import { getClients, saveClient } from "../../services/clientService";
import { fetchCepInfo, fetchCnpjInfo } from "../../services/brasilApi";
import type { Client } from "../../types/client";
import {
  getActiveClinicScopeId,
  setStoredActiveClinicId,
} from "../../services/activeClinicStorage";
import type { Clinic } from "../../types/clinic";
import type { Patient } from "../../types/health";
import { NationalTaxCodeSearch } from "./NationalTaxCodeSearch";
import type {
  NfseCertificateStatus,
  NfseDraft,
  NfseFiscalProfile,
  NfseHistoryItem,
  NfsePreparationResult,
} from "./types";
import {
  configureNfseCertificate,
  cancelNationalNfse,
  deleteRejectedNationalNfse,
  downloadNationalDanfse,
  downloadNationalNfseXml,
  getNfseCertificateStatus,
  getNfseFiscalProfile,
  issueNfse,
  importNationalNfseXml,
  listNationalNfseEvents,
  listNationalNfse,
  prepareNationalNfse,
  printNationalDanfse,
  saveNfseFiscalProfile,
  verifyNationalNfse,
} from "./nfseService";

const digits = (value?: string) => (value || "").replace(/\D/g, "");
const formatTaxId = (value?: string) => {
  const number = digits(value).slice(0, 14);
  if (number.length <= 11)
    return number
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  return number
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};
const formatCurrencyInput = (value: string) => {
  const cents = Number(value.replace(/\D/g, "") || "0");
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: string) => Number(value.replace(/\D/g, "") || "0") / 100;
const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

const emptyProfile = (clinic?: Clinic): NfseFiscalProfile => ({
  regime: "simples",
  providerDocument: digits(clinic?.cnpj),
  municipalRegistration: "",
  issuerCityCode: "",
  defaultServiceCityCode: "",
  nationalTaxCode: "",
  municipalTaxCode: "",
  simpleNationalTaxRegime: 1,
  simpleNationalTotalTaxRate: undefined,
  competence: today().slice(0, 7),
});

const statusTone: Record<string, string> = {
  autorizada: "bg-emerald-100 text-emerald-700",
  recebida: "bg-blue-100 text-blue-700",
  processando: "bg-amber-100 text-amber-700",
  aguardando_envio: "bg-amber-100 text-amber-700",
  rejeitada: "bg-red-100 text-red-700",
  nao_autorizada: "bg-slate-200 text-slate-700",
  cancelada: "bg-slate-800 text-white",
};
const statusLabel: Record<string, string> = {
  autorizada: "Autorizada",
  recebida: "Recebida pela SEFIN",
  processando: "Processando",
  aguardando_envio: "Aguardando reenvio",
  rejeitada: "Rejeitada",
  nao_autorizada: "Não autorizada",
  cancelada: "Cancelada",
};

const NfseView: React.FC = () => {
  const { userRole } = useUser();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicId, setClinicId] = useState(getActiveClinicScopeId() || "");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<NfseFiscalProfile>(emptyProfile());
  const [certificate, setCertificate] = useState<NfseCertificateStatus | null>(
    null,
  );
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [history, setHistory] = useState<NfseHistoryItem[]>([]);
  const [selectedXmlIds, setSelectedXmlIds] = useState<string[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyUpdatedAt, setHistoryUpdatedAt] = useState<Date | null>(null);
  const [environment, setEnvironment] = useState<"homologacao" | "producao">(
    "homologacao",
  );
  const [form, setForm] = useState({
    patientId: "",
    customerDocument: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerPostalCode: "",
    customerStreet: "",
    customerNumber: "",
    customerComplement: "",
    customerNeighborhood: "",
    customerCity: "",
    customerState: "",
    customerCityCode: "",
    competenceDate: today(),
    description: "",
    amount: "R$ 0,00",
    issWithholding: "1",
    irrfAmount: "",
    inssAmount: "",
  });
  const [preparation, setPreparation] = useState<NfsePreparationResult | null>(
    null,
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [clinicOwners, setClinicOwners] = useState<Record<string, { ownerId: string; companyName: string }>>({});
  const [financialTransactionId, setFinancialTransactionId] = useState("");
  const clinic = clinics.find((item) => item.id === clinicId);
  const clinicTaxRegime = clinic?.taxRegime || "simples_nacional";
  const clinicTaxRegimeLabel =
    clinicTaxRegime === "lucro_presumido"
      ? "Lucro Presumido"
      : clinicTaxRegime === "lucro_real"
        ? "Lucro Real"
        : "Simples Nacional";
  const competence = form.competenceDate.slice(0, 7);

  useEffect(() => {
    const raw = sessionStorage.getItem("ercmed:nfse-financial-draft");
    if (!raw) return;
    sessionStorage.removeItem("ercmed:nfse-financial-draft");
    try {
      const source = JSON.parse(raw) as {transactionId?: string; clinicId?: string; customerName?: string; customerDocument?: string; description?: string; amount?: number; competenceDate?: string};
      if (source.clinicId) setClinicId(source.clinicId);
      setFinancialTransactionId(source.transactionId || "");
      setForm((current) => ({...current, customerName: source.customerName || current.customerName, customerDocument: formatTaxId(source.customerDocument || current.customerDocument), description: source.description || current.description, amount: Number(source.amount || 0).toLocaleString("pt-BR", {style: "currency", currency: "BRL"}), competenceDate: source.competenceDate || current.competenceDate}));
      setMessage({tone: "info", text: "Recebimento carregado do financeiro. Confira os dados antes de emitir a NFS-e."});
    } catch { sessionStorage.removeItem("ercmed:nfse-financial-draft"); }
  }, []);
  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase("pt-BR");
    const queryDigits = digits(query);
    return history.filter((item) => {
      if (historyStatus !== "all" && item.status !== historyStatus) return false;
      if (!query) return true;
      const name = String(item.customerName || "").toLocaleLowerCase("pt-BR");
      const documentNumber = digits(item.customerDocument);
      return name.includes(query) || (!!queryDigits && documentNumber.includes(queryDigits));
    });
  }, [history, historySearch, historyStatus]);
  const statusTotals = useMemo(() => ({
    authorized: history.filter((item) => item.status === "autorizada").length,
    pending: history.filter((item) => ["recebida", "processando", "aguardando_envio"].includes(item.status)).length,
    rejected: history.filter((item) => ["rejeitada", "nao_autorizada"].includes(item.status)).length,
  }), [history]);

  useEffect(() => {
    setSelectedXmlIds([]);
  }, [clinicId]);

  useEffect(() => {
    const cep = digits(form.customerPostalCode);
    if (cep.length !== 8) return;
    const timer = window.setTimeout(() => {
      void fetchCepInfo(cep).then((address) => {
        const cityCode = digits(String(address.city_ibge || ""));
        setForm((current) => ({
          ...current,
          customerPostalCode: cep,
          customerStreet: address.street || current.customerStreet,
          customerNeighborhood: address.neighborhood || current.customerNeighborhood,
          customerCity: address.city || current.customerCity,
          customerState: address.state || current.customerState,
          customerCityCode: /^\d{7}$/.test(cityCode) ? cityCode : current.customerCityCode,
        }));
      }).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form.customerPostalCode]);

  useEffect(() => {
    const customerDocument = digits(form.customerDocument);
    if (customerDocument.length !== 14 || /^\d{7}$/.test(form.customerCityCode)) return;
    const timer = window.setTimeout(() => {
      void fetchCnpjInfo(customerDocument).then((company) => {
        const cityCode = digits(String(company.codigo_municipio_ibge || ""));
        setForm((current) => ({...current,
          customerStreet: company.logradouro || current.customerStreet,
          customerNumber: company.numero || current.customerNumber,
          customerNeighborhood: company.bairro || current.customerNeighborhood,
          customerCity: company.municipio || current.customerCity,
          customerState: company.uf || current.customerState,
          customerCityCode: /^\d{7}$/.test(cityCode) ? cityCode : current.customerCityCode,
        }));
      }).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form.customerDocument, form.customerCityCode]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    const delegatedOwnerId = getDelegatedCompanyContext()?.ownerId;
    const clinicPromise = currentUser && (userRole as string) === "accountant"
      ? getAccountantLinks(currentUser.uid, "active").then(async links => {
          const groups = await Promise.all(links.filter(link => link.companyOwnerId).map(async link => ({ link, clinics: await getClinics(link.companyOwnerId) })));
          const owners: Record<string, { ownerId: string; companyName: string }> = {};
          const items = groups.flatMap(({ link, clinics: companyClinics }) => companyClinics.map(item => {
            owners[item.id] = { ownerId: link.companyOwnerId!, companyName: link.companyName || item.name || "Clínica" };
            return item;
          }));
          return { items, owners };
        })
      : getClinics(delegatedOwnerId).then(items => ({ items, owners: {} }));
    Promise.all([clinicPromise, delegatedOwnerId || (userRole as string) === "accountant" ? Promise.resolve([] as Patient[]) : getAllPatients()])
      .then(([clinicResult, patientItems]) => {
        const clinicItems = clinicResult.items;
        setClinicOwners(clinicResult.owners);
        setClinics(clinicItems);
        setPatients(patientItems);
        if (!clinicId && clinicItems.length === 1) {
          setClinicId(clinicItems[0].id);
          setStoredActiveClinicId(clinicItems[0].id);
          const owner = clinicResult.owners[clinicItems[0].id];
          if (owner) setDelegatedCompanyContext(owner);
        }
      })
      .catch(() =>
        setMessage({
          tone: "error",
          text: "Não foi possível carregar clínicas e pacientes.",
        }),
      );
  }, [userRole]);

  const loadUnitData = async () => {
    if (!clinicId) return;
    setBusy("load");
    try {
      const [savedProfile, cert, documents] = await Promise.all([
        getNfseFiscalProfile(clinicId, competence),
        getNfseCertificateStatus(clinicId),
        listNationalNfse(clinicId),
      ]);
      let nextProfile = savedProfile
        ? { ...emptyProfile(clinic), ...savedProfile, competence }
        : emptyProfile(clinic);
      const providerDocument = digits(
        clinic?.cnpj || nextProfile.providerDocument,
      );
      if (
        providerDocument.length === 14 &&
        !/^\d{7}$/.test(nextProfile.issuerCityCode)
      ) {
        try {
          const company = await fetchCnpjInfo(providerDocument);
          const cityCode = digits(String(company.codigo_municipio_ibge || ""));
          nextProfile = {
            ...nextProfile,
            providerDocument,
            issuerCityCode: /^\d{7}$/.test(cityCode)
              ? cityCode
              : nextProfile.issuerCityCode,
            defaultServiceCityCode: /^\d{7}$/.test(cityCode)
              ? cityCode
              : nextProfile.defaultServiceCityCode,
          };
        } catch {
          /* Mantém o preenchimento manual quando a base pública estiver indisponível. */
        }
      } else if (providerDocument)
        nextProfile = { ...nextProfile, providerDocument };
      setProfile(nextProfile);
      setCertificate(cert);
      setHistory(documents);
      setHistoryUpdatedAt(new Date());
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a configuração fiscal.",
      });
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    void loadUnitData();
  }, [clinicId, competence, clinic?.cnpj]);

  useEffect(() => {
    if (!clinicId || !history.some((item) => ["recebida", "processando", "aguardando_envio"].includes(item.status))) return;
    const timer = window.setInterval(() => {
      void listNationalNfse(clinicId).then((documents) => {
        setHistory(documents);
        setHistoryUpdatedAt(new Date());
      }).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [clinicId, history]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !clinicId) return;
    const delegatedOwnerId = getDelegatedCompanyContext()?.ownerId;
    void (delegatedOwnerId ? Promise.resolve(delegatedOwnerId) : getManagerIdForUser(currentUser.uid))
      .then((managerId) => getClients(managerId || currentUser.uid, clinicId))
      .then(setClients);
  }, [clinicId]);

  const draft = useMemo<NfseDraft>(
    () => ({
      environment,
      series: "1",
      number: Math.max(1, Number(Date.now().toString().slice(-9))),
      competenceDate: form.competenceDate,
      issuerCityCode: digits(profile.issuerCityCode),
      provider: {
        cpfCnpj: digits(profile.providerDocument),
        municipalRegistration:
          digits(profile.municipalRegistration) || undefined,
        simpleNationalOption: 3,
        simpleNationalTaxRegime: profile.simpleNationalTaxRegime || 1,
        simpleNationalTotalTaxRate: profile.simpleNationalTotalTaxRate,
        specialTaxRegime: 0,
      },
      customer:
        form.customerDocument || form.customerName
          ? {
              cpfCnpj: digits(form.customerDocument),
              name: form.customerName,
              email: form.customerEmail || undefined,
              phone: form.customerPhone || undefined,
              address: form.customerStreet || form.customerPostalCode
                ? {
                    cityCode: digits(form.customerCityCode),
                    postalCode: digits(form.customerPostalCode),
                    street: form.customerStreet,
                    number: form.customerNumber || "S/N",
                    complement: form.customerComplement || undefined,
                    neighborhood: form.customerNeighborhood,
                  }
                : undefined,
            }
          : undefined,
      service: {
        locationCityCode: digits(
          profile.defaultServiceCityCode || profile.issuerCityCode,
        ),
        nationalTaxCode: digits(profile.nationalTaxCode),
        municipalTaxCode: profile.municipalTaxCode || undefined,
        description: form.description,
        amount: money(form.amount),
        issTaxation: 1,
        issWithholding: Number(form.issWithholding) as 1 | 2 | 3,
        issRate: profile.issRate,
        irrfWithholdingAmount: money(form.irrfAmount) || undefined,
        inssWithholdingAmount: money(form.inssAmount) || undefined,
      },
    }),
    [environment, form, profile],
  );

  const choosePatient = (patientId: string) => {
    const patient = patients.find((item) => item.id === patientId);
    const linkedClient = clients.find((item) => item.id === patient?.clientId);
    setForm((current) => ({
      ...current,
      patientId,
      customerDocument: formatTaxId(linkedClient?.taxId || patient?.cpf || patient?.guardian?.cpf || ""),
      customerName: linkedClient?.name || patient?.name || "",
      customerEmail: linkedClient?.email || patient?.email || patient?.guardian?.email || "",
      customerPhone: linkedClient?.phone || patient?.phone || patient?.guardian?.phone || "",
      customerPostalCode: linkedClient?.postalCode || "",
      customerStreet: linkedClient?.street || "",
      customerNumber: linkedClient?.number || "",
      customerComplement: linkedClient?.complement || "",
      customerNeighborhood: linkedClient?.neighborhood || "",
      customerCity: linkedClient?.city || "",
      customerState: linkedClient?.state || "",
      customerCityCode: linkedClient?.cityCode || "",
    }));
    setPreparation(null);
  };

  const chooseClient = (value: string) => {
    const normalized = value.toLocaleLowerCase("pt-BR").trim();
    const selected = clients.find(
      (item) =>
        item.id === value ||
        item.name.toLocaleLowerCase("pt-BR") === normalized ||
        (!!digits(value) && digits(item.taxId) === digits(value)),
    );
    if (!selected)
      return setForm((current) => ({
        ...current,
        customerName: value,
        patientId: "",
      }));
    setForm((current) => ({
      ...current,
      patientId: "",
      customerDocument: formatTaxId(selected.taxId || ""),
      customerName: selected.name,
      customerEmail: selected.email || "",
      customerPhone: selected.phone || "",
      customerPostalCode: selected.postalCode || "",
      customerStreet: selected.street || "",
      customerNumber: selected.number || "",
      customerComplement: selected.complement || "",
      customerNeighborhood: selected.neighborhood || "",
      customerCity: selected.city || "",
      customerState: selected.state || "",
      customerCityCode: selected.cityCode || "",
    }));
    setPreparation(null);
  };

  const changeCustomerDocument = (value: string) => {
    const formatted = formatTaxId(value);
    const selected = clients.find((item) => digits(item.taxId) === digits(formatted));
    if (selected) return chooseClient(selected.id);
    setForm((current) => ({ ...current, customerDocument: formatted }));
    setPreparation(null);
  };

  const useLastCustomer = () => {
    const last = history.find(
      (item) => item.customerName || item.customerDocument,
    );
    if (!last)
      return setMessage({
        tone: "info",
        text: "Ainda não existe uma nota com cliente neste histórico.",
      });
    setForm((current) => ({
      ...current,
      patientId: "",
      customerName: last.customerName || "",
      customerDocument: formatTaxId(last.customerDocument || ""),
      customerEmail: last.customerEmail || "",
    }));
    setPreparation(null);
  };

  const saveProfile = async () => {
    if (!clinicId) return;
    if (clinicTaxRegime !== "simples_nacional")
      return setMessage({
        tone: "error",
        text: `O emissor atual está configurado para o Simples Nacional. A unidade está cadastrada como ${clinicTaxRegimeLabel}.`,
      });
    setBusy("profile");
    try {
      const saved = await saveNfseFiscalProfile(clinicId, {
        ...profile,
        competence,
      });
      setProfile(saved);
      setMessage({
        tone: "success",
        text: "Configuração fiscal salva para esta unidade.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a configuração.",
      });
    } finally {
      setBusy("");
    }
  };

  const syncCnpj = async () => {
    const providerDocument = digits(clinic?.cnpj || profile.providerDocument);
    if (providerDocument.length !== 14)
      return setMessage({
        tone: "error",
        text: "Cadastre um CNPJ válido na clínica antes de sincronizar.",
      });
    setBusy("sync-cnpj");
    try {
      const company = await fetchCnpjInfo(providerDocument);
      const cityCode = digits(String(company.codigo_municipio_ibge || ""));
      if (!/^\d{7}$/.test(cityCode))
        throw new Error(
          "A base pública não retornou o código IBGE completo do município.",
        );
      setProfile((current) => ({
        ...current,
        providerDocument,
        issuerCityCode: cityCode,
        defaultServiceCityCode: cityCode,
      }));
      setMessage({
        tone: "success",
        text: `CNPJ sincronizado: ${company.municipio}/${company.uf} — IBGE ${cityCode}.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar o CNPJ.",
      });
    } finally {
      setBusy("");
    }
  };

  const saveCertificate = async () => {
    if (!clinicId || !certificateFile || !certificatePassword)
      return setMessage({
        tone: "error",
        text: "Selecione o certificado A1 e informe a senha.",
      });
    setBusy("certificate");
    try {
      const saved = await configureNfseCertificate(
        clinicId,
        certificateFile,
        certificatePassword,
      );
      setCertificate({
        configured: true,
        environment: "producao_restrita",
        ...saved,
      });
      setCertificatePassword("");
      setMessage({
        tone: "success",
        text: "Certificado A1 validado e protegido.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Certificado inválido.",
      });
    } finally {
      setBusy("");
    }
  };

  const prepare = async () => {
    if (!clinicId) return;
    if (clinicTaxRegime !== "simples_nacional")
      return setMessage({
        tone: "error",
        text: `A emissão para ${clinicTaxRegimeLabel} ainda não está habilitada. Revise o regime no cadastro da clínica.`,
      });
    setBusy("prepare");
    setPreparation(null);
    try {
      const result = await prepareNationalNfse(clinicId, draft);
      setPreparation(result);
      setMessage({
        tone: result.validation.valid ? "success" : "error",
        text: result.validation.valid
          ? "Nota validada. Revise os dados antes de transmitir."
          : result.validation.errors.join(" "),
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível validar a nota.",
      });
    } finally {
      setBusy("");
    }
  };

  const transmit = async () => {
    if (!clinicId || !preparation?.validation.valid) return;
    if (environment === "homologacao") {
      setMessage({
        tone: "success",
        text: "Teste concluído: dados e XML validados. Nenhuma nota fiscal real foi transmitida.",
      });
      return;
    }
    if (!certificate?.configured)
      return setMessage({
        tone: "error",
        text: "Configure o certificado A1 antes da emissão em produção.",
      });
    if (
      !window.confirm(
        "Esta NFS-e terá validade fiscal. Confirma a emissão em produção?",
      )
    )
      return;
    setBusy("send");
    try {
      const result = await issueNfse(clinicId, draft);
      const currentUser = auth.currentUser;
      if (currentUser && form.customerName) {
        const managerId =
          (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
        await saveClient(managerId, {
          name: form.customerName,
          taxId: form.customerDocument,
          email: form.customerEmail,
          phone: form.customerPhone,
          postalCode: form.customerPostalCode,
          street: form.customerStreet,
          number: form.customerNumber,
          complement: form.customerComplement,
          neighborhood: form.customerNeighborhood,
          city: form.customerCity,
          state: form.customerState,
          cityCode: form.customerCityCode,
          clinicId,
          unitName: clinic?.name,
          source: "nfse",
          lastDocumentAt: form.competenceDate,
          active: true,
        });
        setClients(await getClients(getDelegatedCompanyContext()?.ownerId || managerId, clinicId));
      }
      if (currentUser && financialTransactionId) {
        const ownerId = getDelegatedCompanyContext()?.ownerId || (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
        const transactions = await getTransactions(ownerId);
        const transaction = transactions.find((item) => item.id === financialTransactionId);
        if (transaction) await syncTransactions(ownerId, [{...transaction, sourceFiscalDocumentId: result.id, fiscalIssuedAt: new Date().toISOString()}]);
        setFinancialTransactionId("");
      }
      setMessage({
        tone: "success",
        text: `NFS-e ${result.status} com sucesso.`,
      });
      setHistory(await listNationalNfse(clinicId));
      setPreparation(null);
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "A SEFIN rejeitou a emissão.",
      });
    } finally {
      setBusy("");
    }
  };

  const verify = async (item: NfseHistoryItem) => {
    if (!clinicId) return;
    setBusy(`verify-${item.id}`);
    try {
      const result = await verifyNationalNfse(clinicId, item.id);
      setMessage({
        tone: result.authorized ? "success" : "info",
        text: result.authorized
          ? "NFS-e localizada e autorizada no Emissor Nacional."
          : "A DPS ainda não foi autorizada no Emissor Nacional.",
      });
      setHistory(await listNationalNfse(clinicId));
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível verificar a DPS.",
      });
    } finally {
      setBusy("");
    }
  };

  const removeRejected = async (item: NfseHistoryItem) => {
    if (
      !clinicId ||
      item.status !== "rejeitada" ||
      !window.confirm("Remover esta nota rejeitada do histórico?")
    )
      return;
    setBusy(`delete-${item.id}`);
    try {
      await deleteRejectedNationalNfse(clinicId, item.id);
      setHistory((current) =>
        current.filter((document) => document.id !== item.id),
      );
      setMessage({
        tone: "success",
        text: "Nota rejeitada removida do histórico.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a nota rejeitada.",
      });
    } finally {
      setBusy("");
    }
  };

  const showEvents = async (item: NfseHistoryItem) => {
    if (!clinicId) return;
    setBusy(`events-${item.id}`);
    try {
      const result = await listNationalNfseEvents(clinicId, item.id);
      const serialized = JSON.stringify(result.events || {}, null, 2);
      window.alert(result.cancelled ? `Esta NFS-e possui evento de cancelamento.\n\n${serialized}` : `Eventos registrados no Emissor Nacional:\n\n${serialized}`);
      setHistory(await listNationalNfse(clinicId));
    } catch (error) {
      setMessage({tone: "error", text: error instanceof Error ? error.message : "Não foi possível consultar os eventos."});
    } finally { setBusy(""); }
  };

  const cancelNfse = async (item: NfseHistoryItem) => {
    if (!clinicId || item.status !== "autorizada") return;
    const reason = window.prompt("Informe o motivo do cancelamento (entre 15 e 255 caracteres). Esta ação será registrada na auditoria:");
    if (!reason) return;
    if (reason.trim().length < 15 || reason.trim().length > 255) {
      setMessage({tone: "error", text: "O motivo deve ter entre 15 e 255 caracteres."});
      return;
    }
    const confirmation = window.prompt(item.environment === "producao" ? "ATENÇÃO: esta é uma nota real. Digite CANCELAR NFS-E REAL para confirmar:" : "Digite CANCELAR para confirmar o cancelamento desta nota de teste:");
    if ((item.environment === "producao" && confirmation !== "CANCELAR NFS-E REAL") || (item.environment !== "producao" && confirmation !== "CANCELAR")) return;
    setBusy(`cancel-${item.id}`);
    try {
      await cancelNationalNfse(clinicId, item.id, 9, reason.trim(), item.environment === "producao");
      setHistory(await listNationalNfse(clinicId));
      setMessage({tone: "success", text: "Cancelamento registrado no Emissor Nacional e na auditoria do ERCMed."});
    } catch (error) {
      setMessage({tone: "error", text: error instanceof Error ? error.message : "Não foi possível cancelar a NFS-e."});
    } finally { setBusy(""); }
  };

  const openDanfse = async (
    item: NfseHistoryItem,
    action: "download" | "print",
  ) => {
    if (!clinicId) return;
    setBusy(`${action}-${item.id}`);
    setMessage({
      tone: "info",
      text:
        action === "download"
          ? "Gerando o PDF da NFS-e..."
          : "Preparando a impressão da NFS-e...",
    });
    try {
      if (action === "download")
        await downloadNationalDanfse(clinicId, item.id);
      else await printNationalDanfse(clinicId, item.id);
      setMessage({
        tone: "success",
        text:
          action === "download"
            ? "PDF gerado. Verifique a pasta de downloads."
            : "Documento preparado para impressão.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o DANFSe.",
      });
    } finally {
      setBusy("");
    }
  };

  const toggleXmlSelection = (id: string) => {
    setSelectedXmlIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const toggleAllXml = () => {
    const historyIds = filteredHistory.map((item) => item.id);
    const allSelected = historyIds.length > 0 && historyIds.every((id) => selectedXmlIds.includes(id));
    setSelectedXmlIds(allSelected ? [] : historyIds);
  };

  const downloadSelectedXml = async () => {
    if (!clinicId || selectedXmlIds.length === 0) return;
    setBusy("download-xml-batch");
    setMessage({ tone: "info", text: `Preparando ${selectedXmlIds.length} XML(s)...` });
    let downloaded = 0;
    for (const id of selectedXmlIds) {
      try {
        await downloadNationalNfseXml(clinicId, id);
        downloaded += 1;
      } catch {
        // Continua o lote quando uma nota ainda não possui XML disponível.
      }
    }
    setBusy("");
    setMessage({
      tone: downloaded === selectedXmlIds.length ? "success" : downloaded > 0 ? "info" : "error",
      text: downloaded === selectedXmlIds.length
        ? `${downloaded} XML(s) baixado(s). Verifique a pasta de downloads.`
        : downloaded > 0
          ? `${downloaded} de ${selectedXmlIds.length} XML(s) foram baixados. Algumas notas ainda não possuem XML disponível.`
          : "Nenhuma das notas selecionadas possui XML disponível.",
    });
  };

  const importXmlFiles = async (files: FileList | null) => {
    if (!clinicId || !files?.length) return;
    setBusy("import-xml");
    let imported = 0;
    let duplicates = 0;
    let rejected = 0;
    for (const file of Array.from(files).slice(0, 100)) {
      try {
        const result = await importNationalNfseXml(clinicId, await file.text());
        if (result.duplicate) duplicates += 1;
        else if (result.imported) imported += 1;
      } catch { rejected += 1; }
    }
    setHistory(await listNationalNfse(clinicId));
    setHistoryUpdatedAt(new Date());
    setBusy("");
    setMessage({tone: rejected ? "info" : "success", text: `${imported} XML(s) importado(s), ${duplicates} já existente(s) e ${rejected} rejeitado(s).`});
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header
          style={{ backgroundColor: "#071a2f" }}
          className="overflow-hidden rounded-3xl border border-slate-700 p-7 text-white shadow-xl"
        >
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-200">
                <FileCheck2 size={14} /> Emissor Nacional
              </span>
              <h1 className="mt-3 text-3xl font-black text-white">
                Emissor NFS-e
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-200">
                Emita notas de serviços da clínica com certificado A1, validação
                prévia e histórico por unidade.
              </p>
            </div>
            <label className="min-w-72">
              <span className="mb-1 block text-xs font-bold text-teal-200">
                CLÍNICA / UNIDADE EMISSORA
              </span>
              <select
                className="w-full rounded-xl border border-white/15 bg-white px-3 py-3 text-sm font-bold text-slate-900"
                value={clinicId}
                onChange={(event) => {
                  setClinicId(event.target.value);
                  setStoredActiveClinicId(event.target.value);
                  const owner = clinicOwners[event.target.value];
                  if (owner) setDelegatedCompanyContext(owner);
                  setPreparation(null);
                }}
              >
                <option value="">Selecione uma unidade</option>
                {clinics.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : message.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
          >
            {message.text}
          </div>
        )}
        {!clinicId ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-amber-600" />
            <h2 className="mt-3 font-black text-amber-900">
              Selecione a clínica emissora
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Cada unidade possui seu próprio CNPJ, perfil fiscal, certificado e
              histórico de notas.
            </p>
          </section>
        ) : (
          <>
            <button type="button" onClick={() => setSetupOpen((current) => !current)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-teal-200 hover:bg-teal-50/30">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><ShieldCheck /></span>
                <div><h2 className="font-black text-slate-950">Configuração fiscal e certificado A1</h2><p className="text-xs text-slate-500">{certificate?.configured ? "Configuração protegida e pronta para emitir" : "Complete a configuração antes de emitir"}</p></div>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-teal-700">{setupOpen ? "Recolher" : "Abrir configuração"}{setupOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
            </button>
            {setupOpen && <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
                      <Building2 />
                    </span>
                    <div>
                      <h2 className="font-black text-slate-950">
                        Configuração fiscal
                      </h2>
                      <p className="text-xs text-slate-500">
                        Dados exclusivos de {clinic?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={busy === "profile"}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {busy === "profile" ? "Salvando..." : "Salvar"}
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      REGIME SINCRONIZADO DA CLÍNICA
                    </span>
                    <div
                      className={`${input} bg-slate-50 font-semibold text-slate-700`}
                    >
                      {clinicTaxRegimeLabel}
                    </div>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      CNPJ DO PRESTADOR
                    </span>
                    <div className="flex gap-2">
                      <input
                        className={`${input} min-w-0 bg-slate-50`}
                        value={profile.providerDocument}
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={syncCnpj}
                        disabled={busy === "sync-cnpj"}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-teal-300 bg-white px-3 text-xs font-black text-teal-700 disabled:opacity-50"
                      >
                        {busy === "sync-cnpj" ? (
                          <Loader2 className="animate-spin" size={15} />
                        ) : (
                          <RefreshCw size={15} />
                        )}{" "}
                        Sincronizar
                      </button>
                    </div>
                  </label>
                  <Field
                    label="INSCRIÇÃO MUNICIPAL"
                    value={profile.municipalRegistration || ""}
                    onChange={(value) =>
                      setProfile((current) => ({
                        ...current,
                        municipalRegistration: digits(value),
                      }))
                    }
                  />
                  <Field
                    label="MUNICÍPIO EMISSOR (IBGE)"
                    value={profile.issuerCityCode}
                    onChange={(value) =>
                      setProfile((current) => ({
                        ...current,
                        issuerCityCode: digits(value).slice(0, 7),
                        defaultServiceCityCode:
                          current.defaultServiceCityCode ||
                          digits(value).slice(0, 7),
                      }))
                    }
                  />
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      CÓDIGO DE TRIBUTAÇÃO NACIONAL
                    </span>
                    <NationalTaxCodeSearch
                      className={input}
                      value={profile.nationalTaxCode}
                      onChange={(value) =>
                        setProfile((current) => ({
                          ...current,
                          nationalTaxCode: value,
                        }))
                      }
                    />
                  </label>
                  <DecimalField
                    label="ALÍQUOTA ISS (%)"
                    value={profile.issRate}
                    min={2}
                    max={5}
                    placeholder="Ex.: 5,00"
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, issRate: value }))
                    }
                  />
                  <DecimalField
                    label="ALÍQUOTA EFETIVA TOTAL DO SIMPLES (%)"
                    value={profile.simpleNationalTotalTaxRate}
                    min={0}
                    max={99.99}
                    placeholder="Ex.: 6,01"
                    onChange={(value) =>
                      setProfile((current) => ({
                        ...current,
                        simpleNationalTotalTaxRate: value,
                      }))
                    }
                  />
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                    <FileKey2 />
                  </span>
                  <div>
                    <h2 className="font-black text-slate-950">
                      Certificado digital A1
                    </h2>
                    <p className="text-xs text-slate-500">
                      Criptografado antes de ser armazenado
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-5 rounded-xl border p-4 ${certificate?.configured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
                >
                  <div className="flex gap-3">
                    {certificate?.configured ? (
                      <ShieldCheck className="text-emerald-600" />
                    ) : (
                      <FileKey2 className="text-amber-600" />
                    )}
                    <div>
                      <p className="font-black text-slate-900">
                        {certificate?.configured
                          ? "Certificado configurado"
                          : "Certificado pendente"}
                      </p>
                      {certificate?.subject && (
                        <p className="mt-1 text-xs text-slate-600">
                          {certificate.subject}
                        </p>
                      )}
                      {certificate?.expiresAt && (
                        <p className="text-xs text-slate-500">
                          Validade:{" "}
                          {new Date(certificate.expiresAt).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    className={input}
                    onChange={(event) =>
                      setCertificateFile(event.target.files?.[0] || null)
                    }
                  />
                  <input
                    type="password"
                    className={input}
                    placeholder="Senha do certificado"
                    value={certificatePassword}
                    onChange={(event) =>
                      setCertificatePassword(event.target.value)
                    }
                  />
                  <button
                    onClick={saveCertificate}
                    disabled={busy === "certificate"}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy === "certificate"
                      ? "Validando certificado..."
                      : "Validar e proteger certificado"}
                  </button>
                </div>
              </article>
            </section>}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Nova NFS-e
                  </h2>
                  <p className="text-sm text-slate-500">
                    Selecione o paciente, descreva o atendimento e revise antes
                    de enviar.
                  </p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    onClick={() => {
                      setEnvironment("homologacao");
                      setPreparation(null);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${environment === "homologacao" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                  >
                    <TestTube2 size={16} />
                    Teste
                  </button>
                  <button
                    onClick={() => {
                      setEnvironment("producao");
                      setPreparation(null);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${environment === "producao" ? "bg-red-600 text-white shadow-sm" : "text-slate-500"}`}
                  >
                    <Send size={16} />
                    Produção
                  </button>
                </div>
              </div>
              {environment === "producao" && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  Atenção: a nota emitida neste ambiente possui validade fiscal.
                </p>
              )}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    CLIENTE — NOME, CPF OU CNPJ
                  </span>
                  <input
                    list="nfse-clients"
                    className={input}
                    value={form.customerName}
                    placeholder="Digite para localizar ou cadastrar"
                    onChange={(event) => chooseClient(event.target.value)}
                  />
                  <datalist id="nfse-clients">
                    {clients.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.taxId || ""}
                      </option>
                    ))}
                  </datalist>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    PACIENTE (OPCIONAL)
                  </span>
                  <select
                    className={input}
                    value={form.patientId}
                    onChange={(event) => choosePatient(event.target.value)}
                  >
                    <option value="">Não vincular paciente</option>
                    {patients
                      .filter(
                        (item) => !item.clinicId || item.clinicId === clinicId,
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <Field
                  label="CPF/CNPJ DO TOMADOR"
                  value={form.customerDocument}
                  onChange={changeCustomerDocument}
                />
                <Field
                  label="E-MAIL"
                  value={form.customerEmail}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, customerEmail: value }))
                  }
                />
                <Field
                  label="TELEFONE DO TOMADOR"
                  value={form.customerPhone}
                  onChange={(value) => setForm((current) => ({ ...current, customerPhone: value }))}
                />
                <Field
                  label="CEP"
                  value={form.customerPostalCode}
                  onChange={(value) => setForm((current) => ({ ...current, customerPostalCode: value }))}
                />
                <Field
                  label="LOGRADOURO"
                  value={form.customerStreet}
                  onChange={(value) => setForm((current) => ({ ...current, customerStreet: value }))}
                />
                <Field
                  label="NÚMERO"
                  value={form.customerNumber}
                  onChange={(value) => setForm((current) => ({ ...current, customerNumber: value }))}
                />
                <Field
                  label="COMPLEMENTO"
                  value={form.customerComplement}
                  onChange={(value) => setForm((current) => ({ ...current, customerComplement: value }))}
                />
                <Field
                  label="BAIRRO"
                  value={form.customerNeighborhood}
                  onChange={(value) => setForm((current) => ({ ...current, customerNeighborhood: value }))}
                />
                <Field
                  label="CIDADE"
                  value={form.customerCity}
                  onChange={(value) => setForm((current) => ({ ...current, customerCity: value }))}
                />
                <Field
                  label="UF"
                  value={form.customerState}
                  onChange={(value) => setForm((current) => ({ ...current, customerState: value.toUpperCase().slice(0, 2) }))}
                />
                <Field
                  label="CÓDIGO IBGE DA CIDADE"
                  value={form.customerCityCode}
                  onChange={(value) => setForm((current) => ({ ...current, customerCityCode: digits(value) }))}
                />
                <p className="-mt-2 text-xs text-slate-500 md:col-span-2">Preenchido automaticamente pelo CNPJ ou CEP. Use a edição manual somente se a base pública não localizar o município.</p>
                <button
                  type="button"
                  onClick={useLastCustomer}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700"
                >
                  Usar cliente da última nota
                </button>
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    COMPETÊNCIA
                  </span>
                  <input
                    type="date"
                    className={input}
                    value={form.competenceDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        competenceDate: event.target.value,
                      }))
                    }
                  />
                </label>
                <Field
                  label="VALOR DO SERVIÇO"
                  value={form.amount}
                  placeholder="R$ 0,00"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      amount: formatCurrencyInput(value),
                    }))
                  }
                />
                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    DESCRIÇÃO DO SERVIÇO
                  </span>
                  <textarea
                    rows={4}
                    className={input}
                    value={form.description}
                    placeholder="Ex.: Atendimento clínico realizado..."
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    RETENÇÃO DE ISS
                  </span>
                  <select
                    className={input}
                    value={form.issWithholding}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        issWithholding: event.target.value,
                      }))
                    }
                  >
                    <option value="1">Não retido</option>
                    <option value="2">Retido pelo tomador</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="IRRF RETIDO"
                    value={form.irrfAmount}
                    placeholder="0,00"
                    onChange={(value) =>
                      setForm((current) => ({ ...current, irrfAmount: value }))
                    }
                  />
                  <Field
                    label="INSS RETIDO"
                    value={form.inssAmount}
                    placeholder="0,00"
                    onChange={(value) =>
                      setForm((current) => ({ ...current, inssAmount: value }))
                    }
                  />
                </div>
              </div>
              {preparation && (
                <div
                  className={`mt-5 rounded-xl border p-4 ${preparation.validation.valid ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
                >
                  <div className="flex items-center gap-2 font-black">
                    {preparation.validation.valid ? (
                      <CheckCircle2 className="text-emerald-600" />
                    ) : (
                      <FileCheck2 className="text-red-600" />
                    )}
                    {preparation.validation.valid
                      ? "Dados validados para transmissão"
                      : "Corrija os dados indicados"}
                  </div>
                  {preparation.validation.errors.length > 0 && (
                    <ul className="mt-2 list-disc pl-6 text-sm text-red-700">
                      {preparation.validation.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={prepare}
                  disabled={!!busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileCheck2 size={17} />
                  {busy === "prepare" ? "Validando..." : "Revisar nota"}
                </button>
                <button
                  onClick={transmit}
                  disabled={
                    !preparation?.validation.valid ||
                    (environment === "producao" && !certificate?.configured) ||
                    !!busy
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 ${environment === "producao" ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"}`}
                >
                  <Send size={17} />
                  {busy === "send"
                    ? "Transmitindo..."
                    : environment === "producao"
                      ? "Emitir NFS-e real"
                      : "Concluir teste sem emitir"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-3">
                  <History className="text-teal-600" />
                  <div>
                    <h2 className="font-black text-slate-950">
                      Histórico da unidade
                    </h2>
                    <p className="text-xs text-slate-500">
                      Últimas notas emitidas ou transmitidas
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:flex">
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-black text-teal-700 shadow-sm hover:bg-teal-50 ${busy === "import-xml" ? "pointer-events-none opacity-50" : ""}`}>
                    {busy === "import-xml" ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                    {busy === "import-xml" ? "Importando..." : "Importar XMLs"}
                    <input type="file" accept=".xml,application/xml,text/xml" multiple className="hidden" onChange={(event) => { void importXmlFiles(event.target.files); event.currentTarget.value = ""; }} />
                  </label>
                  <button
                    onClick={() => void downloadSelectedXml()}
                    disabled={selectedXmlIds.length === 0 || busy === "download-xml-batch"}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === "download-xml-batch" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {busy === "download-xml-batch" ? "Baixando..." : `Baixar XMLs (${selectedXmlIds.length})`}
                  </button>
                  <button
                    onClick={loadUnitData}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Atualizar histórico"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-3 sm:gap-3 sm:p-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 sm:p-3"><p className="text-[10px] font-semibold leading-tight text-emerald-700 sm:text-xs">Autorizadas</p><p className="mt-1 text-xl font-black text-emerald-800 sm:text-2xl">{statusTotals.authorized}</p></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5 sm:p-3"><p className="text-[10px] font-semibold leading-tight text-amber-700 sm:text-xs">Processando</p><p className="mt-1 text-xl font-black text-amber-800 sm:text-2xl">{statusTotals.pending}</p></div>
                <div className="rounded-xl border border-red-100 bg-red-50/60 p-2.5 sm:p-3"><p className="text-[10px] font-semibold leading-tight text-red-700 sm:text-xs">Com rejeição</p><p className="mt-1 text-xl font-black text-red-800 sm:text-2xl">{statusTotals.rejected}</p></div>
              </div>
              <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Buscar nota por nome, CPF ou CNPJ..." aria-label="Buscar nota por nome, CPF ou CNPJ" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                  </div>
                  <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)} aria-label="Filtrar notas por status" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                    <option value="all">Todos os status</option>
                    {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                {historyUpdatedAt && <p className="mt-2 text-right text-[10px] text-slate-400">Status atualizado às {historyUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{statusTotals.pending > 0 ? " · atualização automática ativa" : ""}</p>}
              </div>
              <div className="space-y-3 p-3 md:hidden">
                {filteredHistory.length ? filteredHistory.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selectedXmlIds.includes(item.id)} onChange={() => toggleXmlSelection(item.id)} aria-label={`Selecionar XML da nota ${item.series}/${item.number}`} className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600" />
                      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate font-black text-slate-900">{item.customerName || item.customerDocument || "Tomador não informado"}</p><p className="mt-0.5 text-xs text-slate-500">DPS {item.series}/{item.number} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "—"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusTone[item.status] || "bg-slate-100 text-slate-600"}`}>{statusLabel[item.status] || item.status}</span></div>
                        <p className="mt-3 text-xl font-black text-slate-950">{Number(item.amount || 0).toLocaleString("pt-BR", {style: "currency", currency: "BRL"})}</p><p className="text-xs text-slate-500">{item.environment === "producao" ? "Produção" : "Teste"}</p>
                      </div>
                    </div>
                    {item.error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{item.error}</p>}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button onClick={() => void downloadNationalNfseXml(clinicId, item.id)} className="rounded-xl bg-blue-50 px-2 py-2.5 text-xs font-black text-blue-700">XML</button>
                      {item.status === "autorizada" ? <button onClick={() => void openDanfse(item, "download")} className="rounded-xl bg-teal-50 px-2 py-2.5 text-xs font-black text-teal-700">PDF</button> : <button onClick={() => void showEvents(item)} disabled={!item.accessKey} className="rounded-xl bg-slate-100 px-2 py-2.5 text-xs font-black text-slate-600 disabled:opacity-40">Eventos</button>}
                      {item.status === "autorizada" ? <button onClick={() => void showEvents(item)} className="rounded-xl bg-violet-50 px-2 py-2.5 text-xs font-black text-violet-700">Eventos</button> : item.status === "rejeitada" ? <button onClick={() => void removeRejected(item)} className="rounded-xl bg-red-50 px-2 py-2.5 text-xs font-black text-red-700">Excluir</button> : <button onClick={() => void verify(item)} className="rounded-xl bg-amber-50 px-2 py-2.5 text-xs font-black text-amber-700">Verificar</button>}
                    </div>
                  </article>
                )) : <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Nenhuma NFS-e encontrada.</div>}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={filteredHistory.length > 0 && filteredHistory.every((item) => selectedXmlIds.includes(item.id))}
                          onChange={toggleAllXml}
                          aria-label="Selecionar todas as notas para baixar XML"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">DPS</th>
                      <th className="px-4 py-3">Tomador</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Ambiente</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Documentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.length ? (
                      filteredHistory.map((item) => (
                        <tr key={item.id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedXmlIds.includes(item.id)}
                              onChange={() => toggleXmlSelection(item.id)}
                              aria-label={`Selecionar XML da nota ${item.series}/${item.number}`}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString("pt-BR")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {item.series}/{item.number}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.customerName ||
                              item.customerDocument ||
                              "Não informado"}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {Number(item.amount || 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.environment === "producao"
                              ? "Produção"
                              : "Teste"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[item.status] || "bg-slate-100 text-slate-600"}`}
                            >
                              {statusLabel[item.status] || item.status}
                            </span>
                            {item.status === "aguardando_envio" && (
                              <p className="mt-1 max-w-xs text-[10px] text-amber-700">Reenvio automático{item.retryCount ? ` · tentativa ${item.retryCount}` : ""}{item.nextRetryAt ? ` · previsto ${new Date(item.nextRetryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
                            )}
                            {item.error && (
                              <p className="mt-1 max-w-xs text-xs text-red-600">
                                {item.error}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  downloadNationalNfseXml(clinicId, item.id)
                                }
                                className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                title="Baixar XML"
                              >
                                <Download size={17} />
                              </button>
                              {item.status === "autorizada" && (
                                <>
                                  <button
                                    onClick={() => void openDanfse(item, "download")}
                                    disabled={busy === `download-${item.id}`}
                                    className="rounded-lg px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                                  >
                                    {busy === `download-${item.id}` ? "Gerando..." : "PDF"}
                                  </button>
                                  <button
                                    onClick={() => void openDanfse(item, "print")}
                                    disabled={busy === `print-${item.id}`}
                                    className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                    title="Imprimir DANFSe"
                                  >
                                    <Printer size={17} />
                                  </button>
                                  <button onClick={() => void showEvents(item)} disabled={busy === `events-${item.id}`} className="rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50" title="Consultar eventos fiscais">
                                    Eventos
                                  </button>
                                  <button onClick={() => void cancelNfse(item)} disabled={busy === `cancel-${item.id}`} className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50" title="Cancelar NFS-e autorizada">
                                    Cancelar
                                  </button>
                                </>
                              )}
                              {item.status === "cancelada" && (
                                <button onClick={() => void showEvents(item)} disabled={busy === `events-${item.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><CalendarClock size={15} /> Eventos</button>
                              )}
                              {item.environment === "producao" &&
                                item.status !== "autorizada" && (
                                  <button
                                    onClick={() => verify(item)}
                                    disabled={busy === `verify-${item.id}`}
                                    className="rounded-lg px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                  >
                                    Verificar
                                  </button>
                                )}
                              {item.status === "rejeitada" && (
                                <button
                                  onClick={() => removeRejected(item)}
                                  disabled={busy === `delete-${item.id}`}
                                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  title="Excluir nota rejeitada"
                                >
                                  <Trash2 size={17} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          {historySearch.trim()
                            ? "Nenhuma nota encontrada para esta busca."
                            : "Nenhuma NFS-e emitida nesta unidade."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <label>
    <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
    <input
      className={input}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const DecimalField = ({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (value?: number) => void;
  min: number;
  max: number;
  placeholder: string;
}) => {
  const [text, setText] = useState(
    value == null ? "" : String(value).replace(".", ","),
  );
  useEffect(
    () => setText(value == null ? "" : String(value).replace(".", ",")),
    [value],
  );
  const commit = () => {
    if (!text.trim()) return onChange(undefined);
    const parsed = Number(text.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      onChange(Math.round(parsed * 100) / 100);
      setText(parsed.toFixed(2).replace(".", ","));
    }
  };
  return (
    <label>
      <span className="mb-1 block text-xs font-bold text-slate-500">
        {label}
      </span>
      <input
        className={input}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          if (/^\d{0,2}([,.]\d{0,2})?$/.test(next)) setText(next);
        }}
        onBlur={commit}
      />
      <span className="mt-1 block text-xs text-slate-500">
        Aceita vírgula e duas casas decimais.
      </span>
    </label>
  );
};

export default NfseView;
