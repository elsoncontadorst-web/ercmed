import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 10});

export {
  createMercadoPagoSubscription,
  mercadoPagoWebhook,
} from "./payments/mercadoPago.js";

export {
  configurarCertificadoNfse,
  consultarConfiguracaoNfse,
  consultarPerfilFiscalNfse,
  emitirNfseHomologacao,
  emitirNfseProducao,
  listarNfseNacional,
  obterNfseNacional,
  prepararNfseNacional,
  reenviarNfseProducaoPendente,
  salvarPerfilFiscalNfse,
} from "./nfse/index.js";
