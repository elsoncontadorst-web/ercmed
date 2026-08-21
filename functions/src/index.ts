import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 10});

export {
  createMercadoPagoSubscription,
  mercadoPagoWebhook,
} from "./payments/mercadoPago.js";

export {
  configurarCertificadoNfse,
  cancelarNfseNacional,
  consultarConfiguracaoNfse,
  consultarPerfilFiscalNfse,
  emitirNfseHomologacao,
  emitirNfseProducao,
  excluirNfseRejeitada,
  importarNfseXml,
  listarNfseNacional,
  listarEventosNfse,
  obterNfseNacional,
  obterDanfseNacional,
  prepararNfseNacional,
  reenviarNfseProducaoPendente,
  salvarPerfilFiscalNfse,
  verificarDpsNfseProducao,
} from "./nfse/index.js";

export {changeOwnAccountType} from "./accounts.js";
