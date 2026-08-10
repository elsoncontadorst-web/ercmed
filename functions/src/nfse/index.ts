/* eslint-disable max-len, require-jsdoc */
import {defineSecret} from "firebase-functions/params";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {isAxiosError} from "axios";
import {buildDpsXml, validateNfseDraft} from "./dps";
import {decryptValue, encryptValue, readCertificate} from "./certificateVault";
import {signDpsXml} from "./signer";
import {checkDpsProduction, downloadDanfseProduction, getNfseProduction, transmitDpsProduction, transmitDpsRestricted} from "./sefinClient";
import {NfseDraft} from "./types";

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

async function companyAccess(uid: string, clinicIdValue: unknown): Promise<{
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
  const role = String(data.role || "").toLowerCase();
  const email = String(data.email || "").toLowerCase();
  const managerRoles = ["admin", "manager", "admin_gestor", "admin_master"];
  const isManager = managerRoles.includes(role) || data.isClinicManager === true || email === "elsoncontador.st@gmail.com";
  const ownerId = isManager ? uid : String(data.managerId || "");
  if (!ownerId) throw new HttpsError("permission-denied", "Vinculo com o gestor da clinica nao encontrado.");

  const clinic = await db.collection("users").doc(ownerId).collection("clinics").doc(clinicId).get();
  if (!clinic.exists || clinic.data()?.active === false) {
    throw new HttpsError("permission-denied", "Clinica nao encontrada ou sem acesso.");
  }
  if (!isManager) {
    const clinicIds = Array.isArray(data.clinicIds) ? data.clinicIds.map(String) : [];
    if (String(data.clinicId || "") !== clinicId && !clinicIds.includes(clinicId)) {
      throw new HttpsError("permission-denied", "Sem acesso a esta clinica.");
    }
  }
  return {ownerId, clinicId, scopeId: `${ownerId}__${clinicId}`, canConfigure: isManager};
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
    const {scopeId} = await companyAccess(request.auth.uid, request.data?.clinicId);
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
    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId);
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
    await companyAccess(request.auth.uid, request.data?.clinicId);
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
    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(request.auth.uid, request.data?.clinicId);
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
    const {scopeId} = await companyAccess(userId, request.data?.clinicId);
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

    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(userId, request.data?.clinicId);
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

    const {ownerId, clinicId, scopeId, canConfigure} = await companyAccess(userId, request.data?.clinicId);
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
    const {ownerId, clinicId, scopeId} = await companyAccess(request.auth.uid, request.data?.clinicId);
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
    const {ownerId, clinicId} = await companyAccess(request.auth.uid, request.data?.clinicId);
    const snapshot = await db.collection("nfse_documents").where("ownerId", "==", ownerId).where("clinicId", "==", clinicId).limit(100).get();
    const documents = snapshot.docs.map((item) => {
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
        environment: data.environment || "producao_restrita",
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
      };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return {documents};
  },
);

export const obterNfseNacional = onCall(
  {region: "us-central1"},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const id = String(request.data?.id || "");
    if (!id) throw new HttpsError("invalid-argument", "Identificador da NFS-e nao informado.");
    const {ownerId, clinicId} = await companyAccess(request.auth.uid, request.data?.clinicId);
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
  {region: "us-central1", timeoutSeconds: 60},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Usuario nao autenticado.");
    const id = String(request.data?.id || "");
    const {ownerId, clinicId} = await companyAccess(request.auth.uid, request.data?.clinicId);
    const snapshot = await db.collection("nfse_documents").doc(id).get();
    if (!snapshot.exists || snapshot.data()?.ownerId !== ownerId || snapshot.data()?.clinicId !== clinicId) {
      throw new HttpsError("not-found", "Documento fiscal nao encontrado.");
    }
    const accessKey = String(snapshot.data()?.accessKey || "");
    if (!/^\d{50}$/.test(accessKey)) {
      throw new HttpsError("failed-precondition", "O PDF fica disponivel somente depois da autorizacao da NFS-e.");
    }
    try {
      const pdf = await downloadDanfseProduction(accessKey);
      return {pdfBase64: pdf.toString("base64"), accessKey};
    } catch (error) {
      throw new HttpsError("internal", safeError(error));
    }
  },
);
