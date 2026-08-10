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
  obterDanfseNacional,
  prepararNfseNacional,
  reenviarNfseProducaoPendente,
  salvarPerfilFiscalNfse,
  verificarDpsNfseProducao,
} from "./nfse/index.js";
