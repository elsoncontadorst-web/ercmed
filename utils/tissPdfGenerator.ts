import { jsPDF } from 'jspdf';
import { TissGuide } from '../types/tiss';

export const generateTissGuidePdf = (guide: TissGuide) => {
    const doc = new jsPDF();

    // Configurações iniciais
    doc.setFont('helvetica');
    doc.setFontSize(10);

    // === CABEÇALHO ===
    // Logo ANS (simulado com texto) e Título
    doc.setFontSize(8);
    doc.text('ANS - Agência Nacional de Saúde Suplementar', 105, 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GUIA DE CONSULTA', 105, 18, { align: 'center' });

    // 1 - Registro ANS
    doc.rect(10, 25, 40, 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('1 - Registro ANS', 12, 28);
    // (Valor vindo do insurance, se tivéssemos essa informação completa no objeto guide, por enquanto deixamos em branco ou placeholder)

    // 2 - Número da Guia
    doc.rect(55, 25, 145, 10);
    doc.text('2 - Número da Guia no Prestador', 57, 28);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(guide.guideNumber, 57, 33);

    // === DADOS DO BENEFICIÁRIO ===
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 40, 190, 5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO BENEFICIÁRIO', 105, 44, { align: 'center' });

    // 3 - Número da Carteira
    doc.rect(10, 45, 60, 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('3 - Número da Carteira', 12, 48);
    doc.setFontSize(10);
    doc.text(guide.patientCardNumber || '', 12, 53);

    // 4 - Nome
    doc.rect(75, 45, 90, 10);
    doc.setFontSize(6);
    doc.text('4 - Nome', 77, 48);
    doc.setFontSize(10);
    doc.text(guide.patientName.substring(0, 40), 77, 53);

    // 5 - Validade
    doc.rect(170, 45, 30, 10);
    doc.setFontSize(6);
    doc.text('5 - Validade Carteira', 172, 48);

    // === DADOS DO CONTRATADO ===
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 60, 190, 5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CONTRATADO', 105, 64, { align: 'center' });

    // 6 - Código no Operadora
    doc.rect(10, 65, 40, 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('6 - Cód. na Operadora', 12, 68);

    // 7 - Nome do Contratado
    doc.rect(55, 65, 145, 10);
    doc.setFontSize(6);
    doc.text('7 - Nome do Contratado', 57, 68);
    doc.setFontSize(10);
    doc.text(guide.professionalName, 57, 73);

    // 8 - CNES (Placeholder)
    doc.rect(10, 75, 190, 10);
    doc.setFontSize(6);
    doc.text('8 - Nome do Profissional Executante / Conselho / Número', 12, 78);
    doc.setFontSize(10);
    doc.text(`${guide.professionalName} - CRM: ${guide.professionalCrm || 'N/A'}`, 12, 83);

    // === DADOS DO ATENDIMENTO ===
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 90, 190, 5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO ATENDIMENTO / PROCEDIMENTOS', 105, 94, { align: 'center' });

    // Data, Tipo, Tabela, Código, Descrição...
    doc.setFontSize(7);
    doc.text('Data', 12, 100);
    doc.text('Tab', 35, 100);
    doc.text('Código', 50, 100);
    doc.text('Descrição', 75, 100);
    doc.text('Qtde', 160, 100);
    doc.text('Valor Total', 180, 100);

    let yPos = 105;

    guide.procedures.forEach(proc => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Data (usando guide.serviceDate)
        const date = new Date(guide.serviceDate).toLocaleDateString('pt-BR');
        doc.text(date, 12, yPos);

        // Tab (Fixo 22 - TUSS for example, or simplified)
        doc.text('22', 35, yPos);

        // Código
        doc.text(proc.code, 50, yPos);

        // Descrição
        doc.text(proc.description.substring(0, 45), 75, yPos);

        // Qtde
        doc.text(proc.quantity.toString(), 165, yPos, { align: 'center' });

        // Valor
        doc.text(proc.totalPrice.toFixed(2), 195, yPos, { align: 'right' });

        yPos += 8;

        // Linha divisória
        doc.setDrawColor(200, 200, 200);
        doc.line(10, yPos - 5, 200, yPos - 5);
        doc.setDrawColor(0, 0, 0); // Reset
    });

    // === TOTAIS ===
    yPos = 160; // Posição fixa para totais se a lista for pequena, ou dinâmica

    doc.rect(10, yPos, 190, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações / Justificativa', 12, yPos + 4);
    doc.setFont('helvetica', 'normal');
    if (guide.observations) {
        doc.text(guide.observations, 12, yPos + 9);
    }

    yPos += 20;

    // Assinaturas
    doc.rect(10, yPos, 90, 20);
    doc.setFontSize(6);
    doc.text('Assinatura do Profissional Executante', 12, yPos + 4);

    doc.rect(105, yPos, 95, 20);
    doc.text('Assinatura do Beneficiário ou Responsável', 107, yPos + 4);

    // Save
    doc.save(`guia_tiss_${guide.guideNumber}.pdf`);
};
