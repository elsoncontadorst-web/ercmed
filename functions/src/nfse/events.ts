/* eslint-disable max-len, require-jsdoc */
import {NfseEnvironment} from "./types";

const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");
const escapeXml = (value: string) => String(value || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function brazilDateTime(): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date()).replace(" ", "T");
  return `${parts}-03:00`;
}

export function buildCancellationEventXml(input: {
  accessKey: string; authorDocument: string; environment: NfseEnvironment;
  reasonCode: 1 | 2 | 9; reason: string;
}): string {
  const accessKey = onlyDigits(input.accessKey);
  const author = onlyDigits(input.authorDocument);
  const reason = String(input.reason || "").trim();
  if (!/^\d{50}$/.test(accessKey)) throw new Error("Chave da NFS-e invalida.");
  if (![11, 14].includes(author.length)) throw new Error("CPF/CNPJ do autor do evento invalido.");
  if (reason.length < 15 || reason.length > 255) throw new Error("O motivo deve ter entre 15 e 255 caracteres.");
  if (![1, 2, 9].includes(input.reasonCode)) throw new Error("Codigo do motivo de cancelamento invalido.");
  const authorTag = author.length === 14 ? "CNPJAutor" : "CPFAutor";
  const eventCode = "101101";
  return `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <infPedReg Id="PRE${accessKey}${eventCode}">
    <tpAmb>${input.environment === "producao" ? 1 : 2}</tpAmb>
    <verAplic>ERCMed_1.01</verAplic><dhEvento>${brazilDateTime()}</dhEvento>
    <${authorTag}>${author}</${authorTag}><chNFSe>${accessKey}</chNFSe>
    <e101101><xDesc>Cancelamento de NFS-e</xDesc><cMotivo>${input.reasonCode}</cMotivo><xMotivo>${escapeXml(reason)}</xMotivo></e101101>
  </infPedReg>
</pedRegEvento>`;
}
