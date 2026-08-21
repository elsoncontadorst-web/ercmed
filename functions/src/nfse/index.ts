/* eslint-disable max-len, require-jsdoc */
import {defineSecret} from "firebase-functions/params";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {isAxiosError} from "axios";
import {buildDpsXml, validateNfseDraft} from "./dps";
import {decryptValue, encryptValue, readCertificate} from "./certificateVault";
import {signDpsXml, signNfseEventXml} from "./signer";
import {checkDpsProduction, downloadDanfseProduction, getNfseEvents, getNfseProduction, registerNfseEvent, transmitDpsProduction, transmitDpsRestricted} from "./sefinClient";
import {NfseDraft} from "./types";
import {buildCancellationEventXml} from "./events";

if (!admin.apps.length) admin.initializeApp();

const NFSE_CERTIFICATE_KEY = defineSecret("NFSE_CERTIFICATE_KEY");
const db = admin.firestore();

type NfseCompanyProfile = {
  regime: "simples";
  providerDocument: string;
  municipalRegistration?: string;
  issuerCityCode: string;
  defaultServiceCityCode: string;
  nationalTaxCode: string;
  municipalTaxCode?: string;
  simpleNationalTaxRegime?: 1 | 2 | 3;
  simpleNationalTotalTaxRate?: number;
  issRate?: number;
  competence: string;
};

async function companyAccess(uid: string, clinicIdValue: unknown, targetOwnerIdValue?: unknown): Promise<{
  ownerId: string;
  clinicId: string;
  scopeId: string;
  canConfigure: boolean;
}> {
  const clinicId = String(clinicIdValue || "").trim();
  if (!clinicId || clinicId === "__group__") {
    throw new HttpsError("failed-precondition", "Selecione uma clinica ou unidade antes de usar o emissor.");
  }

  const [systemUser, profile] = await Promise.all([
    db.collection("system_users").doc(uid).get(),
    db.collection("user_profiles").doc(uid).get(),
  ]);
  const data = systemUser.exists ? systemUser.data() || {} : profile.data() || {};
  const role = profile.data()?.accountType === "accountant" ? "accountant" : String(data.role || "").toLowerCase();
  const email = String(data.email || "").toLowerCase();
  const managerRoles = ["admin", "manager", "admin_gestor", "admin_master"];
  const isManager = managerRoles.includes(role) || data.isClinicManager === true || email === "elsoncontador.st@gmail.com";
  const ownOwnerId = isManager ? uid : String(data.managerId || "");
  const requestedOwnerId = String(targetOwnerIdValue || "").trim();
  let ownerId = ownOwnerId;
  let delegated = false;
  if (requestedOwnerId && requestedOwnerId !== ownOwnerId) {
    if (role !== "accountant") throw new HttpsError("permission-denied", "Somente contas de contador podem trabalhar em contexto delegado.");
    const linkId = `${uid}_${requestedOwnerId}`;
    const linkSnapshot = await db.collection("accountant_links").doc(linkId).get();
    const link = linkSnapshot.data() || {};
    const authorized = linkSnapshot.exists && link.status === "active" && link.accountantUid === uid && link.companyOwnerId === requestedOwnerId;
    if (!authorized) throw new HttpsError("permission-denied", "O contador nao possui vinculo ativo com esta empresa.");
    ownerId = requestedOwnerId;
    delegated = true;
  }
  if (!ownerId) throw new HttpsError("permission-denied", "Vinculo com o gestor da clinica nao encontrado.");

  const clinic = await db.collection("users").doc(ownerId).collection("clinics").doc(clinicId).get();
  if (!clinic.exists || clinic.data()?.active === false) {
    throw new HttpsError("permission-denied", "Clinica nao encontrada ou sem acesso.");
  }
  if (!isManager && !delegated) {
    const clinicIds = Array.isArray(data.clinicIds) ? data.clinicIds.map(String) : [];
    if (String(data.clinicId || "") !== clinicId && !clinicIds.includes(clinicId)) {
      throw new HttpsError("permission-denied", "Sem acesso a esta clinica.");
    }
  }
  return {ownerId, clinicId, scopeId: `${ownerId}__${clinicId}`, canConfigure: isManager || delegated};
}

function safeError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "A API Nacional nao respondeu no prazo. Verifique a DPS antes de tentar novamente.";
    }
    if ([502, 504].includes(error.response?.status || 0)) {
      return `A API do Emissor Nacional esta temporariamente indisponivel (HTTP ${error.response?.status}). Nenhuma NFS-e foi autorizada. Aguarde alguns minutos e tente novamente.`;
    }
    if (error.response?.status === 503) {
      return "O Emissor Nacional está temporariamente indisponível (HTTP 503). Nenhuma NFS-e foi autorizada. Aguarde alguns minutos e tente novamente.";
    }
    const data = error.response?.data as {mensagem?: string; mensagemErro?: string; message?: string; erros?: unknown[]} | string | undefined;
    if (typeof data === "string" && data.trim()) return `SEFIN: ${data.trim().slice(0, 1000)}`;
    if (data && typeof data === "object") {
      const details = data.erros?.map((item) => {
        if (!item || typeof item !== "object") return String(item || "");
        const values = Object.entries(item as Record<string, unknown>)
          .filter(([key, value]) => typeof value === "string" && /cod|mens|descr|erro/i.test(key))
          .map(([, value]) => String(value));
        return values.join(" - ");
      }).filter(Boolean).join(" | ");
      return data.mensagem || data.mensagemErro || data.message || details || `SEFIN retornou HTTP ${error.response?.status || "indisponivel"}.`;
    }
    return `SEFIN retornou HTTP ${error.response?.status || "indisponivel"}.`;
  }
  return error instanceof Error ? error.message : "Falha desconhecida na emissao.";
}

function accessKeyFromXml(xml?: string): string | null {
  if (!xml) return null;
  return xml.match(/<chNFSe>(\d{50})<\/chNFSe>/)?.[1] ||
    xml.match(/Id="NFS(\d{50})"/)?.[1] || null;
}

function xmlValue(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return xml.match(new RegExp(`<(?:\\w+:)?${escaped}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${escaped}>`, "i"))?.[1]?.trim() || "";
}

function xmlSection(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return xml.match(new RegExp(`<(?:\\w+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${escaped}>`, "i"))?.[1] || "";
}

function documentEnvironment(value: unknown): "homologacao" | "producao" {
  return value === "producao" ? "producao" : "homologacao";
}

async function companyCertificate(scopeId: string) {
  const snapshot = await db.collection("nfse_private_config").doc(scopeId).get();
  if (!snapshot.exists) throw new HttpsError("failed-precondition", "Configure o certificado A1 antes de consultar ou registrar eventos.");
  const config = snapshot.data() || {};
  const secret = NFSE_CERTIFICATE_KEY.value();
  const pfx = decryptValue(config.encryptedPfx, secret);
  const password = decryptValue(config.encryptedPassword, secret).toString("utf8");
  return {pfx, password, certificate: readCertificate(pfx, password)};
}

function cleanProfile(value: Partial<NfseCompanyProfile>): NfseCompanyProfile {
  const regime = "simples" as const;
  const issRate = value.issRate == null || value.issRate === ("" as unknown) ? undefined : Number(value.issRate);
  const simpleNationalTotalTaxRate = value.simpleNationalTotalTaxRate == null || value.simpleNationalTotalTaxRate === ("" as unknown) ? undefined : Number(value.simpleNationalTotalTaxRate);
  if (issRate != null && (!Number.isFinite(issRate) || issRate < 2 || issRate > 5)) {
    throw new HttpsError("invalid-argument", "A aliquota do ISS deve estar entre 2% e 5%.");
  }
  if (simpleNationalTotalTaxRate == null || !Number.isFinite(simpleNationalTotalTaxRate) || simpleNationalTotalTaxRate < 0 || simpleNationalTotalTaxRate > 99.99) {
    throw new HttpsError("invalid-argument", "Informe a aliquota efetiva total do Simples Nacional da competencia.");
  }
  const competence = String(value.competence || "");
  if (!/^\d{4}-\d{2}$/.test(competence)) throw new HttpsError("invalid-argument", "Competencia mensal invalida.");
  return {
    regime,
    providerDocument: String(value.providerDocument || "").replace(/\D/g, ""),
    municipalRegistration: String(value.municipalRegistration || "").replace(/\D/g, "") || undefined,
    issuerCityCode: String(value.issuerCityCode || "").replace(/\D/g, ""),
    defaultServiceCityCode: String(value.defaultServiceCityCode || "").replace(/\D/g, ""),
    nationalTaxCode: String(value.nationalTaxCode || "").replace(/\D/g, ""),
    municipalTaxCode: String(value.municipalTaxCode || "") || undefined,
    simpleNationalTaxRegime: Number(value.simpleNationalTaxRegime || 1) as 1 | 2 | 3,
    simpleNationalTotalTaxRate,
    issRate,
    competence,
  };
}

export const consultarPerfilFiscalNfse = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {scopeId} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const competence = String(request.data?.competence || "");
    const [company, monthly] = await Promise.all([
      db.collection("nfse_company_config").doc(scopeId).get(),
      /^\d{4}-\d{2}$/.test(competence) ? db.collection("nfse_company_config").doc(scopeId).collection("competences").doc(competence).get() : null,
    ]);
    return {profile: company.exists ? {...company.data(), ...(monthly?.exists ? monthly.data() : {}), competence} : null};
  },
);

export const salvarPerfilFiscalNfse = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Sem permissao para alterar o perfil fiscal.");
    const profile = cleanProfile(request.data?.profile || {});
    const companyRef = db.collection("nfse_company_config").doc(scopeId);
    await Promise.all([
      companyRef.set({
        ownerId,
        clinicId,
        regime: profile.regime,
        providerDocument: profile.providerDocument,
        municipalRegistration: profile.municipalRegistration || null,
        issuerCityCode: profile.issuerCityCode,
        defaultServiceCityCode: profile.defaultServiceCityCode,
        nationalTaxCode: profile.nationalTaxCode,
        municipalTaxCode: profile.municipalTaxCode || null,
        simpleNationalTaxRegime: profile.simpleNationalTaxRegime || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      }, {merge: true}),
      companyRef.collection("competences").doc(profile.competence).set({
        competence: profile.competence,
        issRate: profile.issRate ?? null,
        simpleNationalTotalTaxRate: profile.simpleNationalTotalTaxRate ?? null,
        source: profile.issRate == null ? "parametrizacao_municipal" : "manual_confirmada",
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        confirmedBy: request.auth.uid,
      }, {merge: true}),
    ]);
    return {saved: true, profile};
  },
);

export const prepararNfseNacional = onCall(
  {region: "us-central1", enforceAppCheck: false},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const draft = request.data?.draft as NfseDraft | undefined;
    if (!draft) throw new HttpsError("invalid-argument", "Rascunho da NFS-e nao informado.");
    const validation = validateNfseDraft(draft);
    if (!validation.valid) return {validation, xml: null};
    return {
      validation,
      xml: buildDpsXml(draft),
      schemaVersion: "1.01",
      transmissionReady: false,
      nextRequirement: "Configure o certificado A1 para transmitir na producao restrita.",
    };
  },
);

export const configurarCertificadoNfse = onCall(
  {region: "us-central1", timeoutSeconds: 60, secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Sem permissao para configurar o certificado.");

    const pfxBase64 = String(request.data?.pfxBase64 || "");
    const password = String(request.data?.password || "");
    if (!pfxBase64 || !password) throw new HttpsError("invalid-argument", "Arquivo A1 e senha sao obrigatorios.");
    const pfx = Buffer.from(pfxBase64, "base64");
    if (!pfx.length || pfx.length > 10 * 1024 * 1024) throw new HttpsError("invalid-argument", "Arquivo A1 invalido ou maior que 10 MB.");

    try {
      const material = readCertificate(pfx, password);
      const secret = NFSE_CERTIFICATE_KEY.value();
      await db.collection("nfse_private_config").doc(scopeId).set({
        ownerId,
        clinicId,
        encryptedPfx: encryptValue(pfx, secret),
        encryptedPassword: encryptValue(password, secret),
        certificateSubject: material.subject,
        certificateDocument: material.document || null,
        certificateExpiresAt: admin.firestore.Timestamp.fromDate(material.expiresAt),
        environment: "producao_restrita",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      }, {merge: true});
      return {configured: true, subject: material.subject, expiresAt: material.expiresAt.toISOString()};
    } catch (error) {
      throw new HttpsError("invalid-argument", safeError(error));
    }
  },
);

export const consultarConfiguracaoNfse = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const userId = request.auth.uid;
    const {scopeId} = await companyAccess(userId, request.data?.clinicId, request.data?.targetOwnerId);
    const snapshot = await db.collection("nfse_private_config").doc(scopeId).get();
    if (!snapshot.exists) return {configured: false, environment: "producao_restrita"};
    const data = snapshot.data() || {};
    return {
      configured: true,
      environment: "producao_restrita",
      subject: data.certificateSubject,
      expiresAt: data.certificateExpiresAt?.toDate?.().toISOString(),
    };
  },
);

export const emitirNfseHomologacao = onCall(
  {region: "us-central1", timeoutSeconds: 90, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const userId = request.auth.uid;
    const draft = request.data?.draft as NfseDraft | undefined;
    if (!draft) throw new HttpsError("invalid-argument", "Rascunho da NFS-e nao informado.");
    const restrictedDraft: NfseDraft = {...draft, environment: "homologacao"};
    const validation = validateNfseDraft(restrictedDraft);
    if (!validation.valid) throw new HttpsError("invalid-argument", validation.errors.join(" "));

    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(userId, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Apenas gestores podem emitir NFS-e.");
    const configSnapshot = await db.collection("nfse_private_config").doc(scopeId).get();
    if (!configSnapshot.exists) throw new HttpsError("failed-precondition", "Configure o certificado A1 antes de emitir.");
    const config = configSnapshot.data() || {};
    const secret = NFSE_CERTIFICATE_KEY.value();
    const pfx = decryptValue(config.encryptedPfx, secret);
    const password = decryptValue(config.encryptedPassword, secret).toString("utf8");
    const certificate = readCertificate(pfx, password);
    const providerDocument = restrictedDraft.provider.cpfCnpj.replace(/\D/g, "");
    if (certificate.document && certificate.document !== providerDocument) {
      throw new HttpsError("failed-precondition", "O certificado A1 nao pertence ao prestador informado na DPS.");
    }
    const xml = buildDpsXml(restrictedDraft);
    const signedXml = signDpsXml(xml, certificate);
    const documentId = `${scopeId}_${restrictedDraft.series}_${restrictedDraft.number}`;
    const documentRef = db.collection("nfse_documents").doc(documentId);

    await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(documentRef);
      const previousStatus = previous.data()?.status;
      if (["processando", "recebida", "autorizada"].includes(previousStatus)) {
        throw new HttpsError("already-exists", "Esta serie e numero de DPS ja foram enviados.");
      }
      transaction.set(documentRef, {
        ownerId,
        clinicId,
        environment: "producao_restrita",
        status: "processando",
        series: restrictedDraft.series,
        number: restrictedDraft.number,
        providerDocument: restrictedDraft.provider.cpfCnpj,
        customerDocument: restrictedDraft.customer?.cpfCnpj || null,
        customerName: restrictedDraft.customer?.name || null,
        customerEmail: restrictedDraft.customer?.email || null,
        amount: restrictedDraft.service.amount,
        competenceDate: restrictedDraft.competenceDate,
        signedDpsXml: signedXml,
        createdAt: previous.exists ? previous.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: userId,
      }, {merge: true});
    });

    try {
      const response = await transmitDpsRestricted(signedXml, pfx, password);
      await documentRef.set({
        status: response.authorizedXml ? "autorizada" : "recebida",
        authorizedXml: response.authorizedXml || null,
        accessKey: accessKeyFromXml(response.authorizedXml),
        sefinResponse: response.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return {id: documentId, status: response.authorizedXml ? "autorizada" : "recebida", authorizedXml: response.authorizedXml, response: response.data};
    } catch (error) {
      const originalMessage = safeError(error);
      const message = originalMessage.includes("E0037") ?
        `${originalMessage} O municipio pode nao estar habilitado na base de testes do Emissor Nacional, mesmo estando autorizado em producao. Confirme o IBGE pelo CNPJ antes da emissao real.` : originalMessage;
      console.error("Falha na transmissao da DPS para a SEFIN", JSON.stringify({
        status: isAxiosError(error) ? error.response?.status : undefined,
        response: isAxiosError(error) ? error.response?.data : undefined,
        documentId,
      }));
      await documentRef.set({status: "rejeitada", error: message, updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
      throw new HttpsError("internal", message);
    }
  },
);

export const reenviarNfseProducaoPendente = onSchedule(
  {schedule: "every 5 minutes", region: "us-central1", timeoutSeconds: 300, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async () => {
    const pending = await db.collection("nfse_documents").where("status", "==", "aguardando_envio").limit(20).get();
    for (const item of pending.docs) {
      const data = item.data();
      if (data.environment !== "producao" || !data.signedDpsXml || !data.ownerId) continue;
      try {
        const configSnapshot = await db.collection("nfse_private_config").doc(`${data.ownerId}__${data.clinicId}`).get();
        if (!configSnapshot.exists) throw new Error("Certificado A1 não encontrado.");
        const config = configSnapshot.data() || {};
        const secret = NFSE_CERTIFICATE_KEY.value();
        const pfx = decryptValue(config.encryptedPfx, secret);
        const password = decryptValue(config.encryptedPassword, secret).toString("utf8");
        const signedXml = String(data.signedDpsXml);
        const dpsId = signedXml.match(/Id="(DPS\d+)"/)?.[1];
        if (!dpsId) throw new Error("Identificador da DPS não encontrado.");

        const existing = await checkDpsProduction(dpsId, pfx, password);
        if (existing.exists) {
          const responseText = JSON.stringify(existing.data || {});
          const accessKey = responseText.match(/\d{50}/)?.[0] || null;
          await item.ref.set({status: "autorizada", accessKey, sefinResponse: existing.data || null, error: null, updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
          continue;
        }

        const response = await transmitDpsProduction(signedXml, pfx, password);
        await item.ref.set({
          status: response.authorizedXml ? "autorizada" : "recebida",
          authorizedXml: response.authorizedXml || null,
          accessKey: accessKeyFromXml(response.authorizedXml),
          sefinResponse: response.data,
          error: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      } catch (error) {
        await item.ref.set({
          error: safeError(error),
          retryCount: admin.firestore.FieldValue.increment(1),
          nextRetryAt: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      }
    }
  },
);

export const emitirNfseProducao = onCall(
  {region: "us-central1", timeoutSeconds: 90, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    if (request.data?.confirmation !== "EMITIR NFS-E REAL") {
      throw new HttpsError("failed-precondition", "Confirme explicitamente a emissao da NFS-e real.");
    }
    const userId = request.auth.uid;
    const draft = request.data?.draft as NfseDraft | undefined;
    if (!draft) throw new HttpsError("invalid-argument", "Rascunho da NFS-e nao informado.");
    const productionDraft: NfseDraft = {...draft, environment: "producao"};
    const validation = validateNfseDraft(productionDraft);
    if (!validation.valid) throw new HttpsError("invalid-argument", validation.errors.join(" "));

    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(userId, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Apenas gestores podem emitir NFS-e.");
    const configSnapshot = await db.collection("nfse_private_config").doc(scopeId).get();
    if (!configSnapshot.exists) throw new HttpsError("failed-precondition", "Configure o certificado A1 antes de emitir.");
    const config = configSnapshot.data() || {};
    const secret = NFSE_CERTIFICATE_KEY.value();
    const pfx = decryptValue(config.encryptedPfx, secret);
    const password = decryptValue(config.encryptedPassword, secret).toString("utf8");
    const certificate = readCertificate(pfx, password);
    const providerDocument = productionDraft.provider.cpfCnpj.replace(/\D/g, "");
    if (certificate.document && certificate.document !== providerDocument) {
      throw new HttpsError("failed-precondition", "O certificado A1 nao pertence ao prestador informado na DPS.");
    }
    const signedXml = signDpsXml(buildDpsXml(productionDraft), certificate);
    const documentId = `${scopeId}_prod_${productionDraft.series}_${productionDraft.number}`;
    const documentRef = db.collection("nfse_documents").doc(documentId);

    await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(documentRef);
      const previousStatus = previous.data()?.status;
      if (["processando", "recebida", "autorizada"].includes(previousStatus)) {
        throw new HttpsError("already-exists", "Esta serie e numero de DPS ja foram enviados em producao.");
      }
      transaction.set(documentRef, {
        ownerId,
        clinicId,
        environment: "producao",
        status: "processando",
        series: productionDraft.series,
        number: productionDraft.number,
        providerDocument: productionDraft.provider.cpfCnpj,
        customerDocument: productionDraft.customer?.cpfCnpj || null,
        customerName: productionDraft.customer?.name || null,
        customerEmail: productionDraft.customer?.email || null,
        amount: productionDraft.service.amount,
        competenceDate: productionDraft.competenceDate,
        signedDpsXml: signedXml,
        createdAt: previous.exists ? previous.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: userId,
      }, {merge: true});
    });

    try {
      const response = await transmitDpsProduction(signedXml, pfx, password);
      await documentRef.set({
        status: response.authorizedXml ? "autorizada" : "recebida",
        authorizedXml: response.authorizedXml || null,
        accessKey: accessKeyFromXml(response.authorizedXml),
        sefinResponse: response.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return {id: documentId, status: response.authorizedXml ? "autorizada" : "recebida", authorizedXml: response.authorizedXml, response: response.data};
    } catch (error) {
      const message = safeError(error);
      console.error("Falha na transmissao da DPS para a SEFIN de producao", JSON.stringify({
        status: isAxiosError(error) ? error.response?.status : undefined,
        response: isAxiosError(error) ? error.response?.data : undefined,
        documentId,
      }));
      const unavailable = isAxiosError(error) && error.response?.status === 503;
      await documentRef.set({
        status: unavailable ? "aguardando_envio" : "rejeitada",
        error: message,
        retryCount: unavailable ? admin.firestore.FieldValue.increment(1) : 0,
        nextRetryAt: unavailable ? admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      throw new HttpsError("internal", message);
    }
  },
);

export const verificarDpsNfseProducao = onCall(
  {region: "us-central1", timeoutSeconds: 60, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const id = String(request.data?.id || "");
    const {ownerId, clinicId, scopeId} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const documentRef = db.collection("nfse_documents").doc(id);
    const [documentSnapshot, configSnapshot] = await Promise.all([
      documentRef.get(),
      db.collection("nfse_private_config").doc(scopeId).get(),
    ]);
    const document = documentSnapshot.data();
    if (!documentSnapshot.exists || document?.ownerId !== ownerId || document?.clinicId !== clinicId) {
      throw new HttpsError("not-found", "DPS nao encontrada.");
    }
    if (!configSnapshot.exists) throw new HttpsError("failed-precondition", "Certificado A1 nao encontrado.");
    const signedXml = String(document?.signedDpsXml || "");
    const dpsId = signedXml.match(/Id="(DPS\d+)"/)?.[1];
    if (!dpsId) throw new HttpsError("failed-precondition", "Identificador da DPS nao encontrado.");
    const config = configSnapshot.data() || {};
    const secret = NFSE_CERTIFICATE_KEY.value();
    const pfx = decryptValue(config.encryptedPfx, secret);
    const password = decryptValue(config.encryptedPassword, secret).toString("utf8");
    try {
      const check = await checkDpsProduction(dpsId, pfx, password);
      if (!check.exists) {
        await documentRef.set({status: "nao_autorizada", error: "DPS nao localizada no Emissor Nacional.", updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
        return {authorized: false, status: "nao_autorizada"};
      }
      const accessKey = JSON.stringify(check.data || {}).match(/\d{50}/)?.[0];
      if (!accessKey) throw new Error("A DPS foi localizada, mas a chave da NFS-e nao foi retornada.");
      const nfse = await getNfseProduction(accessKey, pfx, password);
      await documentRef.set({status: "autorizada", accessKey, authorizedXml: nfse.authorizedXml || null, sefinResponse: nfse.data, error: null, updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
      return {authorized: true, status: "autorizada", accessKey};
    } catch (error) {
      throw new HttpsError("internal", safeError(error));
    }
  },
);

export const listarNfseNacional = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {ownerId, clinicId} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const snapshot = await db.collection("nfse_documents").where("ownerId", "==", ownerId).where("clinicId", "==", clinicId).limit(100).get();
    const documents = snapshot.docs.filter((item) => !item.data().deletedAt).map((item) => {
      const data = item.data();
      return {
        id: item.id,
        status: data.status,
        series: data.series,
        number: data.number,
        amount: data.amount,
        competenceDate: data.competenceDate || null,
        customerDocument: data.customerDocument,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        accessKey: data.accessKey,
        error: data.error,
        retryCount: Number(data.retryCount || 0),
        nextRetryAt: data.nextRetryAt?.toDate?.().toISOString() || null,
        environment: data.environment || "producao_restrita",
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
      };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return {documents};
  },
);

export const importarNfseXml = onCall(
  {region: "us-central1", timeoutSeconds: 60, memory: "512MiB"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Sem permissao para importar documentos fiscais.");
    const xml = String(request.data?.xml || "").trim();
    if (!xml || Buffer.byteLength(xml, "utf8") > 3 * 1024 * 1024) throw new HttpsError("invalid-argument", "XML vazio ou maior que 3 MB.");
    if (!/<(?:\w+:)?(?:NFSe|CompNfse|infNFSe)\b/i.test(xml)) throw new HttpsError("invalid-argument", "O arquivo nao possui uma NFS-e reconhecida.");
    const accessKey = String(accessKeyFromXml(xml) || xmlValue(xml, "chNFSe")).replace(/\D/g, "");
    if (!/^\d{50}$/.test(accessKey)) throw new HttpsError("invalid-argument", "Nao foi encontrada uma chave nacional valida no XML.");
    const providerSection = xmlSection(xml, "emit") || xmlSection(xml, "prest") || xmlSection(xml, "prestador");
    const providerDocument = String(xmlValue(providerSection, "CNPJ") || xmlValue(providerSection, "CPF") || xmlValue(xml, "CNPJPrestador") || xmlValue(xml, "CPFPrestador")).replace(/\D/g, "");
    const profile = (await db.collection("nfse_company_config").doc(scopeId).get()).data() || {};
    const expectedDocument = String(profile.providerDocument || "").replace(/\D/g, "");
    if (expectedDocument && providerDocument && expectedDocument !== providerDocument) throw new HttpsError("failed-precondition", "O prestador deste XML nao corresponde ao CNPJ da clinica selecionada.");
    const customerSection = xmlSection(xml, "toma") || xmlSection(xml, "tomador");
    const customerDocument = String(xmlValue(customerSection, "CNPJ") || xmlValue(customerSection, "CPF")).replace(/\D/g, "");
    const customerName = xmlValue(customerSection, "xNome") || xmlValue(customerSection, "RazaoSocial");
    const amountText = xmlValue(xmlSection(xml, "valores") || xml, "vServ") || xmlValue(xml, "vLiq") || xmlValue(xml, "valorServicos") || "0";
    const amount = Number(amountText.replace(",", ".")) || 0;
    const competenceDate = (xmlValue(xml, "dCompet") || xmlValue(xml, "dhEmi") || xmlValue(xml, "dataEmissao")).slice(0, 10) || null;
    const documentId = `${scopeId}_import_${accessKey}`;
    const reference = db.collection("nfse_documents").doc(documentId);
    const previous = await reference.get();
    if (previous.exists && !previous.data()?.deletedAt) return {imported: false, duplicate: true, id: documentId, accessKey};
    await reference.set({ownerId, clinicId, environment: "producao", status: "autorizada", series: xmlValue(xml, "serie") || "XML", number: Number(xmlValue(xml, "nNFSe") || xmlValue(xml, "nNFS-e") || 0), providerDocument: providerDocument || expectedDocument || null, customerDocument: customerDocument || null, customerName: customerName || null, amount, competenceDate, accessKey, authorizedXml: xml, imported: true, importedSource: "xml", importedBy: request.auth.uid, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
    return {imported: true, duplicate: false, id: documentId, accessKey};
  },
);

export const listarEventosNfse = onCall(
  {region: "us-central1", timeoutSeconds: 60, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {ownerId, clinicId, scopeId} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const id = String(request.data?.id || "");
    const reference = db.collection("nfse_documents").doc(id);
    const snapshot = await reference.get();
    const data = snapshot.data() || {};
    if (!snapshot.exists || data.ownerId !== ownerId || data.clinicId !== clinicId) throw new HttpsError("not-found", "NFS-e nao encontrada.");
    const accessKey = String(data.accessKey || accessKeyFromXml(data.authorizedXml) || "");
    if (!/^\d{50}$/.test(accessKey)) throw new HttpsError("failed-precondition", "Esta nota ainda nao possui chave nacional.");
    try {
      const {pfx, password} = await companyCertificate(scopeId);
      const events = await getNfseEvents(accessKey, documentEnvironment(data.environment), pfx, password);
      const cancelled = /101101|cancelamento de nfs-e/i.test(JSON.stringify(events || {}));
      await reference.set({events, eventsCheckedAt: admin.firestore.FieldValue.serverTimestamp(), ...(cancelled ? {status: "cancelada", cancelledExternally: data.status !== "cancelada"} : {}), updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
      return {accessKey, events, cancelled, checkedAt: new Date().toISOString()};
    } catch (error) {
      throw new HttpsError("internal", safeError(error));
    }
  },
);

export const cancelarNfseNacional = onCall(
  {region: "us-central1", timeoutSeconds: 90, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Sem permissao para cancelar esta NFS-e.");
    const id = String(request.data?.id || "");
    const reason = String(request.data?.reason || "").trim();
    const reasonCode = Number(request.data?.reasonCode || 9) as 1 | 2 | 9;
    const reference = db.collection("nfse_documents").doc(id);
    const snapshot = await reference.get();
    const data = snapshot.data() || {};
    if (!snapshot.exists || data.ownerId !== ownerId || data.clinicId !== clinicId) throw new HttpsError("not-found", "NFS-e nao encontrada.");
    const environment = documentEnvironment(data.environment);
    if (environment === "producao" && request.data?.confirmation !== "CANCELAR NFS-E REAL") throw new HttpsError("failed-precondition", "Digite CANCELAR NFS-E REAL para confirmar o cancelamento em producao.");
    if (data.status === "cancelada") throw new HttpsError("already-exists", "Esta NFS-e ja esta cancelada.");
    if (data.status !== "autorizada") throw new HttpsError("failed-precondition", "Somente uma NFS-e autorizada pode ser cancelada.");
    const accessKey = String(data.accessKey || accessKeyFromXml(data.authorizedXml) || "");
    if (!/^\d{50}$/.test(accessKey)) throw new HttpsError("failed-precondition", "Esta nota ainda nao possui chave nacional.");
    try {
      const {pfx, password, certificate} = await companyCertificate(scopeId);
      const profile = (await db.collection("nfse_company_config").doc(scopeId).get()).data() || {};
      const eventXml = buildCancellationEventXml({accessKey, authorDocument: String(profile.providerDocument || certificate.document || data.providerDocument || ""), environment, reasonCode, reason});
      const response = await registerNfseEvent(accessKey, signNfseEventXml(eventXml, certificate), environment, pfx, password);
      const auditRef = db.collection("nfse_event_audit").doc();
      const batch = db.batch();
      batch.set(auditRef, {ownerId, clinicId, nfseDocumentId: id, accessKey, eventCode: "101101", reasonCode, reason, environment, requestedBy: request.auth.uid, success: true, response: response.data, registeredXml: response.authorizedXml || null, createdAt: admin.firestore.FieldValue.serverTimestamp()});
      batch.set(reference, {status: "cancelada", cancelledAt: admin.firestore.FieldValue.serverTimestamp(), cancellationEventId: auditRef.id, cancellationReason: reason, eventsCheckedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
      await batch.commit();
      return {cancelled: true, status: "cancelada", eventId: auditRef.id, accessKey};
    } catch (error) {
      await db.collection("nfse_event_audit").add({ownerId, clinicId, nfseDocumentId: id, accessKey, eventCode: "101101", reasonCode, reason, environment, requestedBy: request.auth.uid, success: false, error: safeError(error), createdAt: admin.firestore.FieldValue.serverTimestamp()});
      throw new HttpsError("internal", safeError(error));
    }
  },
);

export const excluirNfseRejeitada = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const id = String(request.data?.id || "");
    if (!id) throw new HttpsError("invalid-argument", "Identificador da NFS-e nao informado.");
    const {ownerId, clinicId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    if (!canConfigure) throw new HttpsError("permission-denied", "Apenas gestores podem excluir notas rejeitadas.");
    const documentRef = db.collection("nfse_documents").doc(id);
    const snapshot = await documentRef.get();
    const data = snapshot.data();
    if (!snapshot.exists || data?.ownerId !== ownerId || data?.clinicId !== clinicId) {
      throw new HttpsError("not-found", "Documento fiscal nao encontrado.");
    }
    if (data?.status !== "rejeitada") {
      throw new HttpsError("failed-precondition", "Somente notas rejeitadas podem ser excluidas.");
    }
    await documentRef.set({
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: request.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return {deleted: true};
  },
);

export const obterNfseNacional = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const id = String(request.data?.id || "");
    if (!id) throw new HttpsError("invalid-argument", "Identificador da NFS-e nao informado.");
    const {ownerId, clinicId} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const snapshot = await db.collection("nfse_documents").doc(id).get();
    if (!snapshot.exists || snapshot.data()?.ownerId !== ownerId || snapshot.data()?.clinicId !== clinicId) {
      throw new HttpsError("not-found", "Documento fiscal nao encontrado.");
    }
    const data = snapshot.data() || {};
    return {
      id,
      status: data.status,
      accessKey: data.accessKey || null,
      authorizedXml: data.authorizedXml || null,
      signedDpsXml: data.signedDpsXml || null,
      error: data.error || null,
    };
  },
);

export const obterDanfseNacional = onCall(
  {region: "us-central1", timeoutSeconds: 60, memory: "512MiB", secrets: [NFSE_CERTIFICATE_KEY]},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const id = String(request.data?.id || "");
    const {ownerId, clinicId, scopeId} = await companyAccess(request.auth.uid, request.data?.clinicId, request.data?.targetOwnerId);
    const [snapshot, configSnapshot] = await Promise.all([
      db.collection("nfse_documents").doc(id).get(),
      db.collection("nfse_private_config").doc(scopeId).get(),
    ]);
    if (!snapshot.exists || snapshot.data()?.ownerId !== ownerId || snapshot.data()?.clinicId !== clinicId) {
      throw new HttpsError("not-found", "Documento fiscal nao encontrado.");
    }
    const accessKey = String(snapshot.data()?.accessKey || "");
    if (!/^\d{50}$/.test(accessKey)) {
      throw new HttpsError("failed-precondition", "O PDF fica disponivel somente depois da autorizacao da NFS-e.");
    }
    if (!configSnapshot.exists) throw new HttpsError("failed-precondition", "Certificado A1 nao encontrado para esta unidade.");
    const config = configSnapshot.data() || {};
    const secret = NFSE_CERTIFICATE_KEY.value();
    const pfx = decryptValue(config.encryptedPfx, secret);
    const password = decryptValue(config.encryptedPassword, secret).toString("utf8");
    try {
      const pdf = await downloadDanfseProduction(accessKey, pfx, password);
      if (pdf.length < 4 || pdf.subarray(0, 4).toString("ascii") !== "%PDF") {
        throw new Error("O Emissor Nacional nao retornou um arquivo PDF valido.");
      }
      return {pdfBase64: pdf.toString("base64"), accessKey};
    } catch (error) {
      throw new HttpsError("internal", safeError(error));
    }
  },
);
