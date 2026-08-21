/* eslint-disable max-len, require-jsdoc */
import {NfseDraft, NfseValidationResult} from "./types";

const onlyDigits = (value: string): string => value.replace(/\D/g, "");
const xml = (value: string | number): string => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

function documentTag(value: string): string {
  const digits = onlyDigits(value);
  return digits.length === 11 ? `<CPF>${digits}</CPF>` : `<CNPJ>${digits}</CNPJ>`;
}

export function validateNfseDraft(draft: NfseDraft): NfseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const providerDocument = onlyDigits(draft.provider.cpfCnpj);
  const customerDocument = draft.customer ? onlyDigits(draft.customer.cpfCnpj) : "";

  if (![11, 14].includes(providerDocument.length)) errors.push("CPF/CNPJ do prestador invalido.");
  if (draft.customer && ![11, 14].includes(customerDocument.length)) errors.push("CPF/CNPJ do tomador invalido.");
  if (draft.customer?.address) {
    if (!/^\d{7}$/.test(onlyDigits(draft.customer.address.cityCode))) errors.push("Codigo IBGE do municipio do tomador deve ter 7 digitos.");
    if (!/^\d{8}$/.test(onlyDigits(draft.customer.address.postalCode))) errors.push("CEP do tomador deve ter 8 digitos.");
    if (!draft.customer.address.street.trim()) errors.push("Logradouro do tomador e obrigatorio.");
    if (!draft.customer.address.neighborhood.trim()) errors.push("Bairro do tomador e obrigatorio.");
  }
  if (!/^\d{7}$/.test(draft.issuerCityCode)) errors.push("Codigo IBGE do municipio emissor deve ter 7 digitos.");
  if (draft.service.locationCountryCode) {
    if (!/^\d{4}$/.test(draft.service.locationCountryCode)) errors.push("Codigo ISO do pais da prestacao deve ter 4 digitos.");
  } else if (!/^\d{7}$/.test(draft.service.locationCityCode)) errors.push("Codigo IBGE do local da prestacao deve ter 7 digitos.");
  if (!/^\d{6}$/.test(draft.service.nationalTaxCode)) errors.push("Codigo de tributacao nacional deve ter 6 digitos.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.competenceDate)) errors.push("Data de competencia invalida.");
  if (!Number.isInteger(draft.number) || draft.number < 1) errors.push("Numero da DPS deve ser um inteiro positivo.");
  if (!/^\d{1,5}$/.test(draft.series)) errors.push("Serie da DPS deve conter de 1 a 5 digitos.");
  if (!Number.isFinite(draft.service.amount) || draft.service.amount <= 0) errors.push("Valor do servico deve ser maior que zero.");
  const federalWithholdings = [draft.service.irrfWithholdingAmount, draft.service.inssWithholdingAmount].filter((value): value is number => value != null);
  if (federalWithholdings.some((value) => !Number.isFinite(value) || value < 0)) errors.push("Os valores de IRRF e INSS devem ser validos e nao negativos.");
  if (federalWithholdings.reduce((total, value) => total + value, 0) > draft.service.amount) errors.push("As retencoes nao podem superar o valor do servico.");
  if (draft.service.issRate != null && (!Number.isFinite(draft.service.issRate) || draft.service.issRate < 2 || draft.service.issRate > 5)) {
    errors.push("A aliquota do ISS deve estar entre 2% e 5%.");
  }
  if (draft.service.description.trim().length < 3) errors.push("Descricao do servico e obrigatoria.");
  if (draft.provider.simpleNationalOption === 3 && !draft.provider.simpleNationalTaxRegime) {
    errors.push("Regime de apuracao do Simples Nacional e obrigatorio para ME/EPP.");
  }
  if (draft.provider.simpleNationalOption === 3 &&
    (draft.provider.simpleNationalTotalTaxRate == null ||
      !Number.isFinite(draft.provider.simpleNationalTotalTaxRate) ||
      draft.provider.simpleNationalTotalTaxRate < 0 ||
      draft.provider.simpleNationalTotalTaxRate > 99.99)) {
    errors.push("Aliquota efetiva total do Simples Nacional e obrigatoria e deve estar entre 0% e 99,99%.");
  }
  if (draft.service.issWithholding !== 1 && !draft.customer) {
    errors.push("Tomador e obrigatorio quando houver retencao do ISS.");
  }
  if (draft.environment === "producao") warnings.push("Emissao em producao exige confirmacao explicita e certificado A1 valido.");
  if (draft.service.issRate == null) warnings.push("A aliquota sera obtida da parametrizacao municipal quando disponivel.");

  return {valid: errors.length === 0, errors, warnings};
}

export function buildDpsXml(draft: NfseDraft, issuedAt = new Date(Date.now() - 2 * 60 * 1000)): string {
  const validation = validateNfseDraft(draft);
  if (!validation.valid) throw new Error(validation.errors.join(" "));

  const providerDocument = onlyDigits(draft.provider.cpfCnpj);
  const federalRegistrationType = providerDocument.length === 11 ? "1" : "2";
  const id = `DPS${draft.issuerCityCode}${federalRegistrationType}${providerDocument.padStart(14, "0")}${draft.series.padStart(5, "0")}${String(draft.number).padStart(15, "0")}`;
  const customerAddress = draft.customer?.address ? `
      <end>
        <endNac>
          <cMun>${onlyDigits(draft.customer.address.cityCode)}</cMun>
          <CEP>${onlyDigits(draft.customer.address.postalCode)}</CEP>
        </endNac>
        <xLgr>${xml(draft.customer.address.street)}</xLgr>
        <nro>${xml(draft.customer.address.number || "S/N")}</nro>${draft.customer.address.complement ? `
        <xCpl>${xml(draft.customer.address.complement)}</xCpl>` : ""}
        <xBairro>${xml(draft.customer.address.neighborhood)}</xBairro>
      </end>` : "";
  const customer = draft.customer ? `
    <toma>
      ${documentTag(draft.customer.cpfCnpj)}
      <xNome>${xml(draft.customer.name || "Tomador nao informado")}</xNome>${customerAddress}${draft.customer.phone ? `
      <fone>${onlyDigits(draft.customer.phone)}</fone>` : ""}${draft.customer.email ? `
      <email>${xml(draft.customer.email)}</email>` : ""}
    </toma>` : "";
  const simpleRegime = draft.provider.simpleNationalTaxRegime ? `
        <regApTribSN>${draft.provider.simpleNationalTaxRegime}</regApTribSN>` : "";
  const municipalCode = draft.service.municipalTaxCode ? `
        <cTribMun>${xml(draft.service.municipalTaxCode)}</cTribMun>` : "";
  const nbs = draft.service.nbsCode ? `
        <cNBS>${onlyDigits(draft.service.nbsCode)}</cNBS>` : "";
  // Regra E0625: ME/EPP sem retencao nao informa pAliq no bloco municipal.
  const omitIssRate = draft.provider.simpleNationalOption === 3 &&
    draft.provider.simpleNationalTaxRegime === 1 && draft.service.issWithholding === 1;
  const rate = draft.service.issRate == null || omitIssRate ? "" : `
          <pAliq>${draft.service.issRate.toFixed(2)}</pAliq>`;
  const totalTax = draft.provider.simpleNationalOption === 3 ? `
        <totTrib><pTotTribSN>${Number(draft.provider.simpleNationalTotalTaxRate).toFixed(2)}</pTotTribSN></totTrib>` : `
        <totTrib><indTotTrib>0</indTotTrib></totTrib>`;

  // A SEFIN Nacional compara o componente local da data/hora. Envie explicitamente
  // no fuso de Brasilia e com pequena tolerancia para diferenca entre relogios.
  const brasiliaClock = new Date(issuedAt.getTime() - 3 * 60 * 60 * 1000);
  const emissionDate = `${brasiliaClock.toISOString().slice(0, 19)}-03:00`;
  const federalTax = draft.service.inssWithholdingAmount || draft.service.irrfWithholdingAmount ? `
        <tribFed>${draft.service.inssWithholdingAmount ? `
          <vRetCP>${draft.service.inssWithholdingAmount.toFixed(2)}</vRetCP>` : ""}${draft.service.irrfWithholdingAmount ? `
          <vRetIRRF>${draft.service.irrfWithholdingAmount.toFixed(2)}</vRetIRRF>` : ""}
        </tribFed>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <infDPS Id="${id}">
    <tpAmb>${draft.environment === "producao" ? 1 : 2}</tpAmb>
    <dhEmi>${emissionDate}</dhEmi>
    <verAplic>ERCMed_1.0</verAplic>
    <serie>${xml(draft.series)}</serie>
    <nDPS>${draft.number}</nDPS>
    <dCompet>${xml(draft.competenceDate)}</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>${draft.issuerCityCode}</cLocEmi>
    <prest>
      ${documentTag(draft.provider.cpfCnpj)}${draft.provider.municipalRegistration ? `
      <IM>${onlyDigits(draft.provider.municipalRegistration)}</IM>` : ""}
      <regTrib>
        <opSimpNac>${draft.provider.simpleNationalOption}</opSimpNac>${simpleRegime}
        <regEspTrib>${draft.provider.specialTaxRegime}</regEspTrib>
      </regTrib>
    </prest>${customer}
    <serv>
      <locPrest>${draft.service.locationCountryCode ? `<cPaisPrestacao>${draft.service.locationCountryCode}</cPaisPrestacao>` : `<cLocPrestacao>${draft.service.locationCityCode}</cLocPrestacao>`}</locPrest>
      <cServ>
        <cTribNac>${draft.service.nationalTaxCode}</cTribNac>${municipalCode}
        <xDescServ>${xml(draft.service.description.trim())}</xDescServ>${nbs}
      </cServ>
    </serv>
    <valores>
      <vServPrest><vServ>${draft.service.amount.toFixed(2)}</vServ></vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>${draft.service.issTaxation}</tribISSQN>
          <tpRetISSQN>${draft.service.issWithholding}</tpRetISSQN>${rate}
        </tribMun>${federalTax}
${totalTax}
      </trib>
    </valores>
  </infDPS>
</DPS>`;
}
