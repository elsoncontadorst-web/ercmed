import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const nodes = (xml: XMLDocument) => Array.from(xml.getElementsByTagName('*'));
const value = (xml: XMLDocument, name: string) =>
    nodes(xml).find(node => node.localName === name)?.textContent?.trim() || '';
const within = (xml: XMLDocument, container: string, name: string) => {
    const parent = nodes(xml).find(node => node.localName === container);
    return parent ? Array.from(parent.getElementsByTagName('*')).find(node => node.localName === name)?.textContent?.trim() || '' : '';
};

const documentNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return digits || '—';
};

const dateTime = (raw: string) => {
    if (!raw) return '—';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('pt-BR');
};

export async function createDanfsePdf(xmlText: string, fallbackKey: string): Promise<{ blob: Blob; accessKey: string }> {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('O XML autorizado da nota não pôde ser lido.');

    const accessKey = value(xml, 'chNFSe') || fallbackKey;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const qr = await QRCode.toDataURL(`https://www.nfse.gov.br/ConsultaPublica?tpc=1&chave=${encodeURIComponent(accessKey)}`, {
        margin: 0, width: 240, errorCorrectionLevel: 'M'
    });
    const money = (raw: string) => Number(raw || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const text = (content: string, x: number, y: number, width = 62, size = 7, bold = false) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        pdf.text(pdf.splitTextToSize(content || '—', width), x, y);
    };
    const label = (content: string, x: number, y: number) => text(content, x, y, 64, 5.8, true);
    const line = (y: number) => pdf.line(5, y, 205, y);
    const section = (title: string, y: number) => { line(y); text(title, 6, y + 4, 190, 7.2, true); };
    const prestadorCnpj = value(xml, 'CNPJ');
    const tomadorCpfCnpj = within(xml, 'toma', 'CNPJ') || within(xml, 'toma', 'CPF');
    const municipality = value(xml, 'xLocEmi') || value(xml, 'xMun');
    const uf = value(xml, 'UFEmi') || value(xml, 'UF');
    const serviceValue = value(xml, 'vServ') || value(xml, 'vServPrest');
    const liquidValue = value(xml, 'vLiq') || serviceValue;

    pdf.setDrawColor(45, 55, 72); pdf.setLineWidth(0.25); pdf.rect(3, 3, 204, 291);
    pdf.setTextColor(8, 28, 51); text('NFS-e', 7, 13, 42, 19, true);
    text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA — NFS-e', 49, 9, 108, 9, true);
    text('Documento fiscal autorizado pelo Sistema Nacional NFS-e', 49, 14, 108, 6.2);
    text(`Município: ${municipality || '—'} / ${uf || '—'}`, 158, 9, 45, 6.2, true);
    line(17);
    label('CHAVE DE ACESSO DA NFS-e', 7, 21); text(accessKey, 7, 25, 148, 6.5, true);
    pdf.addImage(qr, 'PNG', 174, 19, 25, 25);
    label('NÚMERO DA NFS-e', 7, 32); text(value(xml, 'nNFSe'), 7, 36);
    label('COMPETÊNCIA', 55, 32); text(value(xml, 'dCompet'), 55, 36);
    label('EMISSÃO DA NFS-e', 104, 32); text(dateTime(value(xml, 'dhEmi')), 104, 36);
    label('DPS / SÉRIE', 7, 43); text(`${value(xml, 'nDPS') || '—'} / ${value(xml, 'serie') || '—'}`, 7, 47);
    text('Consulte a autenticidade pela leitura do QR Code ou pela chave de acesso no Portal Nacional da NFS-e.', 151, 47, 52, 5.3);

    section('PRESTADOR DE SERVIÇOS', 53);
    label('CNPJ / CPF', 7, 61); text(documentNumber(prestadorCnpj || value(xml, 'CPF')), 7, 65);
    label('INSCRIÇÃO MUNICIPAL', 55, 61); text(value(xml, 'IM'), 55, 65);
    label('NOME EMPRESARIAL', 7, 72); text(value(xml, 'xNome'), 7, 76, 95, 7.2, true);
    label('MUNICÍPIO / UF', 105, 72); text(`${municipality || '—'} / ${uf || '—'}`, 105, 76);
    label('ENDEREÇO', 7, 83); text(`${value(xml, 'xLgr') || '—'}, ${value(xml, 'nro') || 'S/N'} — ${value(xml, 'xBairro') || '—'}`, 7, 87, 95);
    label('E-MAIL', 105, 83); text(value(xml, 'email'), 105, 87, 96);

    section('TOMADOR DE SERVIÇOS', 94);
    label('CPF / CNPJ', 7, 102); text(documentNumber(tomadorCpfCnpj), 7, 106);
    label('NOME / NOME EMPRESARIAL', 55, 102); text(within(xml, 'toma', 'xNome'), 55, 106, 95, 7.2, true);
    label('ENDEREÇO', 7, 114); text(`${within(xml, 'toma', 'xLgr') || '—'}, ${within(xml, 'toma', 'nro') || 'S/N'} — ${within(xml, 'toma', 'xBairro') || '—'}`, 7, 118, 95);
    label('MUNICÍPIO / CEP', 105, 114); text(`${within(xml, 'toma', 'xMun') || '—'} / ${within(xml, 'toma', 'CEP') || '—'}`, 105, 118);

    section('SERVIÇO PRESTADO', 126);
    label('CÓDIGO DE TRIBUTAÇÃO NACIONAL / MUNICIPAL', 7, 134); text(`${value(xml, 'cTribNac') || '—'} / ${value(xml, 'cTribMun') || '—'}`, 7, 138);
    label('LOCAL DA PRESTAÇÃO', 105, 134); text(`${municipality || '—'} / ${uf || '—'}`, 105, 138);
    label('DESCRIÇÃO DO SERVIÇO', 7, 146); text(value(xml, 'xDescServ'), 7, 151, 194, 7.2);

    section('TRIBUTAÇÃO MUNICIPAL — ISSQN', 171);
    label('BASE DE CÁLCULO', 7, 179); text(money(value(xml, 'vBC') || serviceValue), 7, 183);
    label('ALÍQUOTA', 55, 179); text(value(xml, 'pAliq') ? `${value(xml, 'pAliq')}%` : '—', 55, 183);
    label('ISSQN APURADO', 105, 179); text(money(value(xml, 'vISSQN')), 105, 183);
    label('RETENÇÃO', 155, 179); text(value(xml, 'tpRetISSQN') === '1' ? 'Retido' : 'Não retido', 155, 183);

    section('TRIBUTAÇÃO FEDERAL', 193);
    label('IRRF RETIDO', 7, 201); text(money(value(xml, 'vRetIRRF')), 7, 205);
    label('INSS RETIDO', 55, 201); text(money(value(xml, 'vRetCP')), 55, 205);
    label('PIS', 105, 201); text(money(value(xml, 'vPis')), 105, 205);
    label('COFINS', 155, 201); text(money(value(xml, 'vCofins')), 155, 205);

    section('VALOR TOTAL DA NFS-e', 216);
    label('VALOR DO SERVIÇO', 7, 224); text(money(serviceValue), 7, 229, 60, 10, true);
    label('TOTAL DE RETENÇÕES', 78, 224); text(money(value(xml, 'vTotTrib')), 78, 229, 60, 10, true);
    label('VALOR LÍQUIDO', 149, 224); text(money(liquidValue), 149, 229, 52, 10, true);

    section('INFORMAÇÕES COMPLEMENTARES', 240);
    text(value(xml, 'infAdic') || 'Documento Auxiliar da Nota Fiscal de Serviços Eletrônica.', 7, 248, 194, 6.5);
    line(279); label('Nº NFS-e / CHAVE DE ACESSO', 7, 285); text(`${value(xml, 'nNFSe') || '—'} / ${accessKey}`, 7, 289, 194, 6);

    return { blob: pdf.output('blob'), accessKey };
}
