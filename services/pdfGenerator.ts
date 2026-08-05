import { jsPDF } from 'jspdf';

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

export interface ProfessionalCashFlowRow {
    monthName: string;
    revenue: number;
    expenses: number;
    balance: number;
    accumulatedBalance: number;
}

export interface BillingReportUnit {
    name: string;
    clinical: number;
    laboratory: number;
    other: number;
    total: number;
    entries: number;
}

interface ProfessionalPdfOptions {
    unitName: string;
    periodLabel: string;
    includeForecast?: boolean;
}

const pdfMoney = (value: number) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safePdfFilePart = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

const drawProfessionalHeader = (doc: jsPDF, title: string, options: ProfessionalPdfOptions) => {
    const width = doc.internal.pageSize.getWidth();
    doc.setFillColor(9, 30, 50);
    doc.rect(0, 0, width, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ERCMED', 14, 15);
    doc.setFontSize(12.5);
    doc.text(title, 14, 25);
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.text(options.unitName, 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Período: ${options.periodLabel}`, 14, 50);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, width - 14, 50, { align: 'right' });
};

const drawProfessionalFooter = (doc: jsPDF) => {
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Documento gerado pelo ERCMed — Gestão Inteligente em Saúde', 14, height - 9);
        doc.text(`Página ${page} de ${totalPages}`, width - 14, height - 9, { align: 'right' });
    }
};

const drawSummaryCards = (doc: jsPDF, items: Array<{ label: string; value: number; positive?: boolean }>, y = 57) => {
    const width = doc.internal.pageSize.getWidth();
    const margin = 14;
    const gap = 5;
    const cardWidth = (width - (margin * 2) - (gap * (items.length - 1))) / items.length;
    items.forEach((item, index) => {
        const x = margin + index * (cardWidth + gap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cardWidth, 23, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label, x + 4, y + 8);
        doc.setFontSize(10.5);
        doc.setTextColor(item.positive === false ? 225 : 5, item.positive === false ? 29 : 150, item.positive === false ? 72 : 105);
        doc.text(pdfMoney(item.value), x + 4, y + 17);
    });
};

export const generateProfessionalCashFlowPDF = (
    rows: ProfessionalCashFlowRow[],
    options: ProfessionalPdfOptions
) => {
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const totalExpenses = rows.reduce((sum, row) => sum + row.expenses, 0);
    const result = totalRevenue - totalExpenses;
    drawProfessionalHeader(doc, 'Extrato financeiro e fluxo de caixa', options);
    drawSummaryCards(doc, [
        { label: 'ENTRADAS', value: totalRevenue },
        { label: 'SAÍDAS', value: totalExpenses, positive: false },
        { label: 'RESULTADO', value: result, positive: result >= 0 }
    ]);

    let y = 92;
    const columns = [
        ['Mês', 14, 'left'], ['Entradas', 80, 'right'], ['Saídas', 119, 'right'],
        ['Resultado', 158, 'right'], ['Acumulado', width - 14, 'right']
    ] as const;
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(14, y - 7, width - 28, 10, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    columns.forEach(([label, x, align]) => doc.text(label, x, y, { align }));
    y += 8;
    rows.forEach((row, index) => {
        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, y - 5, width - 28, 9, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(row.monthName, 14, y);
        doc.text(pdfMoney(row.revenue), 80, y, { align: 'right' });
        doc.text(pdfMoney(row.expenses), 119, y, { align: 'right' });
        doc.setTextColor(row.balance >= 0 ? 5 : 225, row.balance >= 0 ? 150 : 29, row.balance >= 0 ? 105 : 72);
        doc.text(pdfMoney(row.balance), 158, y, { align: 'right' });
        doc.text(pdfMoney(row.accumulatedBalance), width - 14, y, { align: 'right' });
        y += 9;
    });
    if (options.includeForecast) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9);
        doc.text('Este extrato inclui valores projetados pela simulação de previsão.', 14, y + 5);
    }
    drawProfessionalFooter(doc);
    doc.save(`extrato-financeiro-${safePdfFilePart(options.unitName) || 'grupo'}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateProfessionalBillingPDF = (
    units: BillingReportUnit[],
    options: ProfessionalPdfOptions
) => {
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const totals = units.reduce((sum, unit) => ({
        clinical: sum.clinical + unit.clinical,
        laboratory: sum.laboratory + unit.laboratory,
        total: sum.total + unit.total,
        entries: sum.entries + unit.entries
    }), { clinical: 0, laboratory: 0, total: 0, entries: 0 });
    drawProfessionalHeader(doc, 'Relatório profissional de faturamento', options);
    drawSummaryCards(doc, [
        { label: 'FATURAMENTO TOTAL', value: totals.total },
        { label: 'CLÍNICO', value: totals.clinical },
        { label: 'LABORATÓRIO', value: totals.laboratory }
    ]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${totals.entries.toLocaleString('pt-BR')} lançamento(s) de receita considerado(s).`, 14, 89);
    let y = 103;
    const columns = [
        ['Empresa / unidade', 14, 'left'], ['Clínico', 101, 'right'], ['Laboratório', 139, 'right'],
        ['Outros', 171, 'right'], ['Total', width - 14, 'right']
    ] as const;
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(14, y - 7, width - 28, 10, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    columns.forEach(([label, x, align]) => doc.text(label, x, y, { align }));
    y += 8;
    units.forEach((unit, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, y - 5, width - 28, 9, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const unitLabel = doc.splitTextToSize(unit.name, 73)[0];
        doc.text(unitLabel, 14, y);
        doc.text(pdfMoney(unit.clinical), 101, y, { align: 'right' });
        doc.text(pdfMoney(unit.laboratory), 139, y, { align: 'right' });
        doc.text(pdfMoney(unit.other), 171, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(pdfMoney(unit.total), width - 14, y, { align: 'right' });
        y += 9;
    });
    drawProfessionalFooter(doc);
    doc.save(`relatorio-faturamento-${safePdfFilePart(options.unitName) || 'grupo'}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export interface ExecutiveFinancialTransaction {
    date: string;
    dueDate?: string;
    description: string;
    category?: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'paid' | 'pending';
    revenueUnit?: 'clinical' | 'laboratory';
    unitName?: string;
}

export const generateExecutiveFinancialPDF = (
    transactions: ExecutiveFinancialTransaction[],
    units: BillingReportUnit[],
    monthlyRows: ProfessionalCashFlowRow[],
    options: ProfessionalPdfOptions
) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a3' });
    const pageWidth = 297;
    const pageHeight = 420;
    const navy: [number, number, number] = [9, 30, 50];
    const teal: [number, number, number] = [5, 150, 105];
    const red: [number, number, number] = [225, 29, 72];
    const blue: [number, number, number] = [46, 112, 188];
    const orange: [number, number, number] = [245, 158, 11];
    const border: [number, number, number] = [218, 226, 235];
    const totalRevenue = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const profit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const pendingIncome = transactions.filter(t => t.type === 'income' && t.status === 'pending');
    const pendingExpense = transactions.filter(t => t.type === 'expense' && t.status === 'pending');
    const totalReceivable = pendingIncome.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalPayable = pendingExpense.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const latestMonthIndex = monthlyRows.reduce((latest, row, index) => row.revenue || row.expenses ? index : latest, 0);
    const currentMonth = monthlyRows[latestMonthIndex] || monthlyRows[0];
    const previousMonth = monthlyRows[Math.max(0, latestMonthIndex - 1)] || currentMonth;
    const variance = (current: number, previous: number) => previous ? ((current - previous) / Math.abs(previous)) * 100 : 0;
    const shortMoney = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

    const box = (x: number, y: number, w: number, h: number, title: string) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...border);
        doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.7);
        doc.setTextColor(...navy);
        doc.text(title, x + 3, y + 6);
        doc.setDrawColor(233, 238, 244);
        doc.line(x, y + 9, x + w, y + 9);
    };
    const tableRow = (values: string[], xs: number[], y: number, bold = false, color: [number, number, number] = navy) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(...color);
        values.forEach((value, index) => doc.text(value, xs[index], y, { align: index === 0 ? 'left' : 'right' }));
    };
    const groupBy = (items: ExecutiveFinancialTransaction[]) => {
        const map = new Map<string, number>();
        items.forEach(item => map.set(item.category || 'Outros', (map.get(item.category || 'Outros') || 0) + Number(item.amount || 0)));
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    };
    const drawDonut = (
        cx: number,
        cy: number,
        radius: number,
        values: number[],
        colors: Array<[number, number, number]>,
        centerLabel: string
    ) => {
        const rawTotal = values.reduce((sum, value) => sum + Math.max(0, value), 0);
        const total = rawTotal || 1;
        let start = -Math.PI / 2;
        const donutValues = rawTotal ? values : [1];
        const donutColors = rawTotal ? colors : [[203, 213, 225] as [number, number, number]];
        donutValues.forEach((value, valueIndex) => {
            const span = Math.max(0, value) / total * Math.PI * 2;
            const steps = Math.max(2, Math.ceil(span / (Math.PI / 90)));
            doc.setFillColor(...donutColors[valueIndex % donutColors.length]);
            for (let step = 0; step < steps; step += 1) {
                const a1 = start + (span * step / steps);
                const a2 = start + (span * (step + 1) / steps);
                doc.triangle(cx, cy, cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, 'F');
            }
            start += span;
        });
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, radius - 4.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.2);
        doc.setTextColor(...navy);
        doc.text(centerLabel, cx, cy + 1.5, { align: 'center' });
    };

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...border);
    doc.roundedRect(4, 4, 289, 27, 2, 2, 'FD');
    doc.setFillColor(...navy);
    doc.roundedRect(9, 9, 13, 13, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('+', 15.5, 19, { align: 'center' });
    doc.setTextColor(...navy);
    doc.setFontSize(9);
    doc.text(options.unitName.toUpperCase(), 27, 14);
    doc.setFontSize(4.5);
    doc.text('GESTÃO INTELIGENTE EM SAÚDE', 27, 20);
    doc.setFontSize(12);
    doc.text('RELATÓRIO EXECUTIVO FINANCEIRO', 148.5, 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(activeUnitSubtitle(options.unitName), 148.5, 23, { align: 'center' });
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', 241, 10);
    doc.setFont('helvetica', 'normal');
    doc.text(options.periodLabel, 241, 15);
    doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 241, 21);

    box(4, 34, 289, 44, '1. RESUMO EXECUTIVO');
    const currentMargin = currentMonth?.revenue ? currentMonth.balance / currentMonth.revenue * 100 : 0;
    const previousMargin = previousMonth?.revenue ? previousMonth.balance / previousMonth.revenue * 100 : 0;
    const summary = [
        { label: 'RECEITA TOTAL', value: totalRevenue, color: teal, current: currentMonth?.revenue || 0, previous: previousMonth?.revenue || 0, higherIsBetter: true, percentagePoints: false },
        { label: 'DESPESAS TOTAIS', value: totalExpenses, color: red, current: currentMonth?.expenses || 0, previous: previousMonth?.expenses || 0, higherIsBetter: false, percentagePoints: false },
        { label: 'LUCRO LÍQUIDO', value: profit, color: profit >= 0 ? teal : red, current: currentMonth?.balance || 0, previous: previousMonth?.balance || 0, higherIsBetter: true, percentagePoints: false },
        { label: 'MARGEM LÍQUIDA', value: margin, color: teal, current: currentMargin, previous: previousMargin, higherIsBetter: true, percentagePoints: true },
        { label: 'EBITDA', value: profit, color: profit >= 0 ? blue : red, current: currentMonth?.balance || 0, previous: previousMonth?.balance || 0, higherIsBetter: true, percentagePoints: false },
        { label: 'DISPONÍVEL EM CAIXA', value: profit - totalPayable, color: profit - totalPayable >= 0 ? orange : red, current: currentMonth?.accumulatedBalance || 0, previous: previousMonth?.accumulatedBalance || 0, higherIsBetter: true, percentagePoints: false }
    ] as const;
    summary.forEach((item, index) => {
        const x = 7 + index * 47.5;
        doc.setFillColor(250, 252, 254);
        doc.setDrawColor(...border);
        doc.roundedRect(x, 46, 44, 27, 1.5, 1.5, 'FD');
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(x + 3, 50, 6, 6, 1.2, 1.2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.4);
        doc.text(['R$', '-$', '+', '%', 'E', '$'][index], x + 6, 54.2, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.8);
        doc.setTextColor(...navy);
        doc.text(item.label, x + 11, 54);
        doc.setFontSize(9);
        const valueLabel = item.label.includes('MARGEM') ? `${Number(item.value).toFixed(1)}%` : `R$ ${shortMoney(Number(item.value))}`;
        doc.text(valueLabel, x + 22, 63, { align: 'center' });
        doc.setFontSize(4.2);
        const delta = item.percentagePoints
            ? item.current - item.previous
            : (item.previous !== 0 ? variance(item.current, item.previous) : 0);
        const hasComparison = item.previous !== 0 || item.current === 0;
        const favorable = item.higherIsBetter ? delta >= 0 : delta <= 0;
        const comparisonColor: [number, number, number] = !hasComparison ? [100, 116, 139] : favorable ? teal : red;
        doc.setTextColor(...comparisonColor);
        const comparisonLabel = !hasComparison
            ? 'Sem base anterior'
            : item.current === 0 && item.previous === 0
                ? 'Sem variação'
                : `${delta >= 0 ? 'Alta' : 'Queda'} de ${Math.abs(delta).toFixed(1)}${item.percentagePoints ? ' p.p.' : '%'} vs ${previousMonth?.monthName || 'anterior'}`;
        doc.text(comparisonLabel, x + 22, 69, { align: 'center' });
    });

    box(4, 81, 124, 79, '2. RESULTADO CONSOLIDADO DO GRUPO');
    const consolidatedRows = [
        ['Receita Total', currentMonth?.revenue || 0, previousMonth?.revenue || 0],
        ['(-) Despesas Operacionais', -(currentMonth?.expenses || 0), -(previousMonth?.expenses || 0)],
        ['Lucro Líquido', currentMonth?.balance || 0, previousMonth?.balance || 0],
        ['Margem Líquida', currentMonth?.revenue ? currentMonth.balance / currentMonth.revenue * 100 : 0, previousMonth?.revenue ? previousMonth.balance / previousMonth.revenue * 100 : 0],
        ['EBITDA', currentMonth?.balance || 0, previousMonth?.balance || 0]
    ] as const;
    doc.setFillColor(...navy); doc.rect(7, 93, 118, 8, 'F');
    tableRow(['Descrição', currentMonth?.monthName || 'Atual', previousMonth?.monthName || 'Anterior', 'Var.'], [9, 72, 101, 122], 98, true, [255, 255, 255]);
    consolidatedRows.forEach((row, i) => {
        const percentage = row[0].includes('Margem');
        tableRow([row[0], percentage ? `${row[1].toFixed(1)}%` : `R$ ${shortMoney(row[1])}`, percentage ? `${row[2].toFixed(1)}%` : `R$ ${shortMoney(row[2])}`, `${variance(row[1], row[2]).toFixed(1)}%`], [9, 72, 101, 122], 108 + i * 9, i === 2 || i === 4, variance(row[1], row[2]) >= 0 ? teal : red);
    });

    box(131, 81, 162, 79, '3. RESULTADO POR EMPRESA');
    doc.setFillColor(...navy); doc.rect(134, 93, 156, 8, 'F');
    tableRow(['Empresa', 'Receita', 'Despesas', 'Lucro', 'Margem'], [136, 198, 230, 262, 287], 98, true, [255, 255, 255]);
    const resultRows = units.length === 1 ? [
        units[0],
        { ...units[0], name: 'Faturamento clínico', total: units[0].clinical },
        { ...units[0], name: 'Faturamento laboratorial', total: units[0].laboratory },
        { ...units[0], name: 'Outras receitas', total: units[0].other }
    ] : units.slice(0, 7);
    resultRows.forEach((unit, i) => {
        const expenseShare = totalRevenue ? totalExpenses * (unit.total / totalRevenue) : 0;
        const unitProfit = unit.total - expenseShare;
        tableRow([doc.splitTextToSize(unit.name, 48)[0], `R$ ${shortMoney(unit.total)}`, `R$ ${shortMoney(expenseShare)}`, `R$ ${shortMoney(unitProfit)}`, `${(unit.total ? unitProfit / unit.total * 100 : 0).toFixed(1)}%`], [136, 198, 230, 262, 287], 108 + i * 7, false, unitProfit >= 0 ? navy : red);
    });

    box(4, 163, 92, 72, '4. RANKING DAS EMPRESAS (Lucro Líquido)');
    const maxUnit = Math.max(...units.map(unit => unit.total), 1);
    units.slice(0, 6).forEach((unit, i) => {
        const y = 177 + i * 8;
        doc.setFontSize(4.8); doc.setTextColor(...navy); doc.text(doc.splitTextToSize(unit.name, 29)[0], 7, y);
        doc.setFillColor(...teal); doc.rect(38, y - 4, Math.max(1, (unit.total / maxUnit) * 42), 4, 'F');
        doc.text(`R$ ${shortMoney(unit.total)}`, 83, y, { align: 'right' });
    });

    box(99, 163, 99, 72, '5. EVOLUÇÃO MENSAL (Receita x Despesa)');
    const maxMonthly = Math.max(...monthlyRows.map(row => Math.max(row.revenue, row.expenses)), 1);
    monthlyRows.forEach((row, i) => {
        const x = 106 + i * 7.1;
        const revH = (row.revenue / maxMonthly) * 40;
        const expH = (row.expenses / maxMonthly) * 40;
        doc.setFillColor(...teal); doc.rect(x, 222 - revH, 2.5, revH, 'F');
        doc.setFillColor(...red); doc.rect(x + 2.8, 222 - expH, 2.5, expH, 'F');
        doc.setFontSize(3.8); doc.setTextColor(...navy); doc.text(row.monthName.slice(0, 3), x + 2.5, 228, { align: 'center' });
    });

    box(201, 163, 92, 72, '6. COMPOSIÇÃO DA RECEITA (Por tipo)');
    const clinical = units.reduce((sum, unit) => sum + unit.clinical, 0);
    const laboratory = units.reduce((sum, unit) => sum + unit.laboratory, 0);
    const other = units.reduce((sum, unit) => sum + unit.other, 0);
    drawDonut(224, 200, 15, [clinical, laboratory, other], [teal, blue, orange], `R$ ${shortMoney(totalRevenue)}`);
    [['Clínico', clinical, teal], ['Laboratório', laboratory, blue], ['Outros', other, orange]].forEach((item, i) => {
        const y = 181 + i * 14;
        doc.setFillColor(...item[2] as [number, number, number]); doc.circle(247, y - 1.5, 2, 'F');
        doc.setFontSize(5.2); doc.setTextColor(...navy); doc.text(String(item[0]), 252, y);
        doc.text(`R$ ${shortMoney(Number(item[1]))}`, 278, y, { align: 'right' });
        doc.text(`${(totalRevenue ? Number(item[1]) / totalRevenue * 100 : 0).toFixed(1)}%`, 287, y, { align: 'right' });
    });

    const incomeCategories = groupBy(transactions.filter(t => t.type === 'income'));
    const expenseCategories = groupBy(transactions.filter(t => t.type === 'expense'));
    box(4, 238, 92, 70, '7. RECEITAS POR CATEGORIA (Top 5)');
    incomeCategories.slice(0, 6).forEach(([name, value], i) => tableRow([doc.splitTextToSize(name, 39)[0], `R$ ${shortMoney(value)}`, `${(totalRevenue ? value / totalRevenue * 100 : 0).toFixed(1)}%`], [7, 77, 92], 252 + i * 8, i === 5));
    box(99, 238, 99, 70, '8. DESPESAS POR CATEGORIA');
    drawDonut(121, 275, 14, expenseCategories.slice(0, 5).map(item => item[1]), [blue, teal, orange, red, [148, 163, 184]], `R$ ${shortMoney(totalExpenses)}`);
    expenseCategories.slice(0, 5).forEach(([name, value], i) => tableRow([doc.splitTextToSize(name, 30)[0], `R$ ${shortMoney(value)}`, `${(totalExpenses ? value / totalExpenses * 100 : 0).toFixed(1)}%`], [140, 180, 194], 255 + i * 9));
    box(201, 238, 92, 70, '9. CONTAS A RECEBER');
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.text(`Total a receber: R$ ${shortMoney(totalReceivable)}`, 204, 251);
    const agingLabels = [['A vencer', .45, teal], ['1 a 30 dias', .27, blue], ['31 a 60 dias', .16, orange], ['61 a 90 dias', .08, red], ['+ 90 dias', .04, [148, 163, 184] as [number, number, number]]] as const;
    drawDonut(222, 280, 13, agingLabels.map(item => totalReceivable * item[1]), agingLabels.map(item => item[2]), `R$ ${shortMoney(totalReceivable)}`);
    agingLabels.forEach(([label, share, color], i) => { const y = 262 + i * 8; doc.setFillColor(...color); doc.circle(241, y - 1.5, 1.5, 'F'); tableRow([label, `R$ ${shortMoney(totalReceivable * share)}`, `${(share * 100).toFixed(0)}%`], [245, 275, 288], y); });

    box(4, 311, 82, 55, '10. CONTAS A PAGAR');
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text(`Total a pagar: R$ ${shortMoney(totalPayable)}`, 7, 325);
    drawDonut(21, 346, 11, agingLabels.map(item => totalPayable * item[1]), agingLabels.map(item => item[2]), `R$ ${shortMoney(totalPayable)}`);
    agingLabels.slice(0, 4).forEach(([label, share, color], i) => { const y = 335 + i * 7; doc.setFillColor(...color); doc.circle(38, y - 1.3, 1.4, 'F'); tableRow([label, `R$ ${shortMoney(totalPayable * share)}`], [42, 79], y); });
    box(89, 311, 127, 55, `11. FLUXO DE CAIXA (${currentMonth?.monthName || options.periodLabel})`);
    const flowValues = [previousMonth?.accumulatedBalance || 0, currentMonth?.revenue || 0, -(currentMonth?.expenses || 0), currentMonth?.accumulatedBalance || profit];
    const flowMax = Math.max(...flowValues.map(Math.abs), 1);
    flowValues.forEach((value, i) => { const x = 104 + i * 27; const h = Math.abs(value) / flowMax * 28; doc.setFillColor(...(value >= 0 ? (i === 1 ? teal : blue) : red)); doc.rect(x, 352 - h, 14, h, 'F'); doc.setFontSize(4.5); doc.setTextColor(...navy); doc.text(['Saldo inicial', 'Entradas', 'Saídas', 'Saldo final'][i], x + 7, 359, { align: 'center' }); });
    box(219, 311, 74, 55, '12. INDICADORES FINANCEIROS');
    const indicators = [['Liquidez corrente', totalPayable ? totalReceivable / totalPayable : 0], ['Margem líquida', margin], ['Endividamento', totalRevenue ? totalPayable / totalRevenue * 100 : 0], ['Prazo médio recebimento', 30], ['Prazo médio pagamento', 28]];
    indicators.forEach(([label, value], i) => tableRow([String(label), `${Number(value).toFixed(i === 0 ? 2 : 1)}${i === 1 || i === 2 ? '%' : i > 2 ? ' dias' : ''}`], [222, 289], 325 + i * 7));

    box(4, 369, 96, 38, '13. ALERTAS E PENDÊNCIAS');
    const alerts = [
        totalReceivable > 0 ? `Contas a receber em aberto: R$ ${shortMoney(totalReceivable)}.` : 'Sem contas a receber vencidas.',
        totalPayable > 0 ? `Contas a pagar em aberto: R$ ${shortMoney(totalPayable)}.` : 'Sem contas a pagar pendentes.',
        margin < 10 ? `Margem líquida requer atenção (${margin.toFixed(1)}%).` : `Margem líquida saudável (${margin.toFixed(1)}%).`
    ];
    alerts.forEach((alert, i) => { doc.setFillColor(...(i === 2 && margin >= 10 ? teal : orange)); doc.circle(9, 382 + i * 7 - 1.5, 1.6, 'F'); doc.setFontSize(5); doc.setTextColor(...navy); doc.text(doc.splitTextToSize(alert, 82)[0], 13, 382 + i * 7); });
    box(103, 369, 190, 38, '14. COMENTÁRIOS DO PERÍODO');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.4); doc.setTextColor(...navy);
    const commentary = `O período registrou receita de ${pdfMoney(totalRevenue)}, despesas de ${pdfMoney(totalExpenses)} e resultado líquido de ${pdfMoney(profit)}. A margem líquida ficou em ${margin.toFixed(1)}%. ${profit >= 0 ? 'O resultado foi positivo, indicando equilíbrio entre faturamento e custos.' : 'O resultado foi negativo; recomenda-se revisar despesas e acelerar a cobrança.'}`;
    doc.text(doc.splitTextToSize(commentary, 180), 107, 382);
    doc.setFont('helvetica', 'bold'); doc.text(`Recomendação: acompanhar o faturamento por unidade e as pendências financeiras semanalmente.`, 107, 399);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(100, 116, 139);
    doc.text('Relatório gerado pelo ERCMed — Gestão Inteligente em Saúde', pageWidth / 2, pageHeight - 5, { align: 'center' });
    doc.text('Página 1 de 1', pageWidth - 6, pageHeight - 5, { align: 'right' });
    doc.save(`relatorio-executivo-financeiro-${safePdfFilePart(options.unitName) || 'grupo'}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const activeUnitSubtitle = (unitName: string) =>
    unitName.toLowerCase().includes('consolidado') ? 'Consolidado do Grupo' : `Empresa: ${unitName}`;
