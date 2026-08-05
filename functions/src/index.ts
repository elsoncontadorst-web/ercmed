import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 10});

export {
  createMercadoPagoSubscription,
  mercadoPagoWebhook,
} from "./payments/mercadoPago.js";
