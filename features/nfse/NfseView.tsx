import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Download,
  FileCheck2,
  FileKey2,
  History,
  Loader2,
  Printer,
  RefreshCw,
  Save,
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
import { getClients, saveClient } from "../../services/clientService";
import { fetchCnpjInfo } from "../../services/brasilApi";
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
  deleteRejectedNationalNfse,
  downloadNationalDanfse,
  downloadNationalNfseXml,
  getNfseCertificateStatus,
  getNfseFiscalProfile,
  issueNfse,
  listNationalNfse,
  prepareNationalNfse,
  printNationalDanfse,
  saveNfseFiscalProfile,
  verifyNationalNfse,
} from "./nfseService";

const digits = (value?: string) => (value || "").replace(/\D/g, "");
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", ".")) || 0;
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
};

const NfseView: React.FC = () => {
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
  const [history, setHistory] = useState<NfseHistoryItem[]>([]);
  const [environment, setEnvironment] = useState<"homologacao" | "producao">(
    "homologacao",
  );
  const [form, setForm] = useState({
    patientId: "",
    customerDocument: "",
    customerName: "",
    customerEmail: "",
    competenceDate: today(),
    description: "",
    amount: "",
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
    Promise.all([getClinics(), getAllPatients()])
      .then(([clinicItems, patientItems]) => {
        setClinics(clinicItems);
        setPatients(patientItems);
        if (!clinicId && clinicItems.length === 1) {
          setClinicId(clinicItems[0].id);
          setStoredActiveClinicId(clinicItems[0].id);
        }
      })
      .catch(() =>
        setMessage({
          tone: "error",
          text: "Não foi possível carregar clínicas e pacientes.",
        }),
      );
  }, []);

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
    const currentUser = auth.currentUser;
    if (!currentUser || !clinicId) return;
    void getManagerIdForUser(currentUser.uid)
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
    setForm((current) => ({
      ...current,
      patientId,
      customerDocument: patient?.cpf || patient?.guardian?.cpf || "",
      customerName: patient?.name || "",
      customerEmail: patient?.email || patient?.guardian?.email || "",
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
      customerDocument: selected.taxId || "",
      customerName: selected.name,
      customerEmail: selected.email || "",
    }));
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
      customerDocument: last.customerDocument || "",
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
          clinicId,
          unitName: clinic?.name,
          source: "nfse",
          lastDocumentAt: form.competenceDate,
          active: true,
        });
        setClients(await getClients(managerId, clinicId));
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
            <section className="grid gap-5 lg:grid-cols-2">
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
            </section>

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
                  onChange={(value) => chooseClient(value)}
                />
                <Field
                  label="E-MAIL"
                  value={form.customerEmail}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, customerEmail: value }))
                  }
                />
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
                  placeholder="0,00"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      amount: value.replace(/[^\d,.]/g, ""),
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
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
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
                <button
                  onClick={loadUnitData}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
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
                    {history.length ? (
                      history.map((item) => (
                        <tr key={item.id}>
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
                              {item.status}
                            </span>
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
                                </>
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
                          colSpan={7}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          Nenhuma NFS-e emitida nesta unidade.
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
