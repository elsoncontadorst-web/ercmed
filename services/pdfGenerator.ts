import jsPDF from 'jspdf';

export const generateCNISAnalysisPDF = (analysisText: string, fileName: string = 'analise-cnis.pdf') => {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Análise de CNIS', 105, 20, { align: 'center' });

        // Subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Cálculo PREV - Elson Ribeiro Contabilidade', 105, 30, { align: 'center' });

        // Date
        doc.setFontSize(10);
        const currentDate = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        doc.text(`Data: ${currentDate}`, 105, 40, { align: 'center' });

        // Line separator
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);

        // Content
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Split text into lines that fit the page width
        const pageWidth = doc.internal.pageSize.getWidth();
        const margins = 20;
        const maxLineWidth = pageWidth - (margins * 2);

        const lines = doc.splitTextToSize(analysisText, maxLineWidth);

        let yPosition = 55;
        const lineHeight = 7;
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomMargin = 20;

        lines.forEach((line: string) => {
            // Check if we need a new page
            if (yPosition + lineHeight > pageHeight - bottomMargin) {
                doc.addPage();
                yPosition = 20;
            }

            doc.text(line, margins, yPosition);
            yPosition += lineHeight;
        });

        // Footer on last page
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${totalPages}`,
                105,
                pageHeight - 10,
                { align: 'center' }
            );
            doc.text(
                'Este documento é uma análise preliminar. Consulte um especialista para orientação oficial.',
                105,
                pageHeight - 5,
                { align: 'center' }
            );
        }

        // Save the PDF
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return false;
    }
};

export const generateCashFlowPDF = (entries: any[], fileName: string = 'fluxo-caixa.pdf') => {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Fluxo de Caixa', 105, 20, { align: 'center' });

        // Subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Elson Ribeiro Contabilidade', 105, 30, { align: 'center' });

        // Date
        doc.setFontSize(10);
        const currentDate = new Date().toLocaleDateString('pt-BR');
        doc.text(`Data: ${currentDate}`, 105, 40, { align: 'center' });

        // Line separator
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);

        // Table header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        let yPos = 55;

        doc.text('Mês', 25, yPos);
        doc.text('Receita', 60, yPos);
        doc.text('Despesas', 95, yPos);
        doc.text('Folha', 130, yPos);
        doc.text('Saldo', 165, yPos);

        yPos += 5;
        doc.line(20, yPos, 190, yPos);
        yPos += 5;

        // Table content
        doc.setFont('helvetica', 'normal');

        entries.forEach((entry) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            doc.text(months[entry.month - 1], 25, yPos);
            doc.text(entry.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 60, yPos);
            doc.text(entry.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 95, yPos);
            doc.text(entry.payroll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 130, yPos);

            const balance = entry.revenue - entry.expenses - entry.payroll;
            doc.setTextColor(balance >= 0 ? 0 : 255, balance >= 0 ? 128 : 0, 0);
            doc.text(balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 165, yPos);
            doc.setTextColor(0, 0, 0);

            yPos += 7;
        });

        // Save
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return false;
    }
};
