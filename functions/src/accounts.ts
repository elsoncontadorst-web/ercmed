/* eslint-disable max-len */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const changeOwnAccountType = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Entre novamente para alterar o tipo da conta.");
  const accountType = String(request.data?.accountType || "");
  if (!["clinic", "accountant"].includes(accountType)) throw new HttpsError("invalid-argument", "Tipo de conta inválido.");

  const uid = request.auth.uid;
  const email = String(request.auth.token.email || "").toLowerCase();
  const current = await db.collection("user_profiles").doc(uid).get();
  const currentData = current.data() || {};
  if (String(currentData.role || "") === "admin_master" || email === "elsoncontador.st@gmail.com") {
    throw new HttpsError("failed-precondition", "A conta administradora master não pode trocar de tipo.");
  }
  if (currentData.managerId && currentData.managerId !== uid) {
    throw new HttpsError("failed-precondition", "Contas vinculadas a uma clínica devem ser desvinculadas pelo gestor antes da troca.");
  }

  const accountantInput = request.data?.accountantProfile || {};
  const role = accountType === "accountant" ? "accountant" : "admin_gestor";
  const update: Record<string, unknown> = {
    uid,
    email,
    accountType,
    role,
    ownerId: uid,
    isClinicManager: accountType === "clinic",
    managerId: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (accountType === "accountant") {
    const name = String(accountantInput.name || currentData.displayName || "").trim();
    if (!name) throw new HttpsError("invalid-argument", "Informe o nome do contador ou responsável.");
    update.accountantProfile = {
      name,
      crc: String(accountantInput.crc || "").trim().toUpperCase(),
      officeName: String(accountantInput.officeName || "").trim(),
      officeCNPJ: String(accountantInput.officeCNPJ || "").replace(/\D/g, ""),
      phone: String(accountantInput.phone || "").trim(),
    };
  } else {
    update.accountantProfile = admin.firestore.FieldValue.delete();
  }

  const batch = db.batch();
  batch.set(db.collection("users").doc(uid), update, {merge: true});
  batch.set(db.collection("user_profiles").doc(uid), update, {merge: true});
  batch.set(db.collection("account_type_audit").doc(), {
    actorUid: uid,
    previousType: currentData.accountType || null,
    nextType: accountType,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return {accountType, role};
});
