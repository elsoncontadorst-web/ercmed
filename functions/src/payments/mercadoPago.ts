import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {defineSecret} from "firebase-functions/params";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const mercadoPagoToken = defineSecret("MERCADO_PAGO_ACCESS_TOKEN");
const siteUrl = "https://ercmed.com.br";
const webhookUrl =
  "https://us-central1-healtmed-6fad9.cloudfunctions.net/mercadoPagoWebhook";

type PaidPlanId = "silver" | "gold" | "enterprise";

const plans: Record<PaidPlanId, {title: string; price: number}> = {
  silver: {title: "ERCMed Professional", price: 119},
  gold: {title: "ERCMed Advanced", price: 190},
  enterprise: {title: "ERCMed Enterprise AI", price: 390},
};

function isPaidPlan(value: unknown): value is PaidPlanId {
  return typeof value === "string" && value in plans;
}

async function mercadoPagoRequest(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${mercadoPagoToken.value()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    console.error("Mercado Pago request failed", response.status, body);
    throw new HttpsError(
      "internal",
      "Não foi possível iniciar o pagamento. Tente novamente."
    );
  }
  return body;
}

async function resolveManager(uid: string) {
  const profileSnap = await db.collection("user_profiles").doc(uid).get();
  const profile = profileSnap.data() || {};
  const managerId = typeof profile.managerId === "string" ?
    profile.managerId : uid;
  const isManager = managerId === uid &&
    (profile.isClinicManager === true ||
      ["admin", "manager", "admin_gestor", "admin_master"]
        .includes(String(profile.role || "")));

  if (!isManager) {
    throw new HttpsError(
      "permission-denied",
      "Somente o gestor da clínica pode contratar ou alterar o plano."
    );
  }
  return {managerId, email: String(profile.email || "")};
}

export const createMercadoPagoSubscription = onCall(
  {secrets: [mercadoPagoToken], region: "us-central1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Entre na sua conta para continuar.");
    }
    const planId = request.data?.planId;
    if (!isPaidPlan(planId)) {
      throw new HttpsError("invalid-argument", "Plano inválido.");
    }

    const {managerId, email} = await resolveManager(request.auth.uid);
    const payerEmail = request.auth.token.email || email;
    if (!payerEmail) {
      throw new HttpsError(
        "failed-precondition",
        "Cadastre um e-mail válido antes de contratar."
      );
    }

    const plan = plans[planId];
    const billingRef = db.collection("billing_subscriptions").doc();
    const externalReference = `${managerId}:${planId}:${billingRef.id}`;
    const subscription = await mercadoPagoRequest("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: plan.title,
        external_reference: externalReference,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: plan.price,
          currency_id: "BRL",
        },
        back_url: `${siteUrl}/?subscription=return`,
        notification_url: webhookUrl,
        status: "pending",
      }),
    });

    await billingRef.set({
      ownerId: managerId,
      requestedBy: request.auth.uid,
      planId,
      amount: plan.price,
      provider: "mercado_pago",
      providerSubscriptionId: subscription.id,
      externalReference,
      status: subscription.status || "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const checkoutUrl = subscription.init_point;
    if (typeof checkoutUrl !== "string") {
      throw new HttpsError("internal", "O Mercado Pago não retornou o checkout.");
    }
    return {checkoutUrl, subscriptionId: subscription.id};
  }
);

async function activateSubscription(subscription: Record<string, unknown>) {
  const reference = String(subscription.external_reference || "");
  const [ownerId, planId, billingId] = reference.split(":");
  if (!ownerId || !billingId || !isPaidPlan(planId)) {
    console.warn("Invalid Mercado Pago external reference", reference);
    return;
  }

  const expected = plans[planId].price;
  const recurring = subscription.auto_recurring as
    Record<string, unknown> | undefined;
  const amount = Number(recurring?.transaction_amount || 0);
  const status = String(subscription.status || "");
  const active = status === "authorized";
  const batch = db.batch();
  const billingRef = db.collection("billing_subscriptions").doc(billingId);

  batch.set(billingRef, {
    providerSubscriptionId: subscription.id,
    status,
    amount,
    verified: active && amount === expected,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  if (active && amount === expected) {
    const subscriptionData = {
      accountTier: planId,
      subscriptionStatus: "active",
      subscriptionProvider: "mercado_pago",
      subscriptionId: subscription.id,
      subscriptionAmount: expected,
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(db.collection("user_profiles").doc(ownerId),
      subscriptionData, {merge: true});
    batch.set(db.collection("system_users").doc(ownerId),
      subscriptionData, {merge: true});
    batch.set(db.collection("users").doc(ownerId), {
      status: "active",
      planType: "monthly",
      accountTier: planId,
      subscriptionProvider: "mercado_pago",
      subscriptionId: subscription.id,
      lastPaymentDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  }
  await batch.commit();
}

export const mercadoPagoWebhook = onRequest(
  {secrets: [mercadoPagoToken], region: "us-central1"},
  async (request, response) => {
    try {
      const body = request.body as Record<string, unknown> | undefined;
      const data = body?.data as Record<string, unknown> | undefined;
      const id = String(data?.id || request.query.id || "");
      const type = String(body?.type || request.query.type ||
        request.query.topic || "");
      if (!id || !["subscription_preapproval", "preapproval"].includes(type)) {
        response.status(200).send("ignored");
        return;
      }
      const subscription = await mercadoPagoRequest(`/preapproval/${id}`);
      await activateSubscription(subscription);
      response.status(200).send("ok");
    } catch (error) {
      console.error("Mercado Pago webhook processing failed", error);
      response.status(500).send("processing failed");
    }
  }
);
