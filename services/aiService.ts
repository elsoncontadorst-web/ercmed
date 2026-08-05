
import { Anamnesis, PatientEvolution, Prescription, ExamRequest, ExamResult } from "../types/health";
import { generateWithClinicalAi } from './clinicalAiService';

interface ClinicalContext {
    anamneses: Anamnesis[];
    evolutions?: PatientEvolution[];
    prescriptions?: Prescription[];
    examRequests?: ExamRequest[];
    examResults?: ExamResult[];
}

export const generateClinicalSummary = async (context: ClinicalContext): Promise<string> => {
    const { anamneses, evolutions = [], prescriptions = [], examRequests = [], examResults = [] } = context;

    if (!anamneses || anamneses.length === 0) {
        throw new Error("Nenhuma anamnese fornecida para geração do resumo.");
    }

    try {
        // Construct the prompt
        let prompt = `Aja como Médico Especialista e Auditor. Realize "Inteligência Clínica Avançada" e gere uma Anamnese Mista (Síntese Integrada).

OBJETIVOS:
1. Consolidar anamneses.
2. Analisar evolução temporal.
3. Correlacionar queixas com exames/condutas.
4. Identificar padrões e sugerir diagnósticos.
5. Avaliar eficácia do tratamento.

ESTRUTURA: I. RESUMO | II. EVOLUÇÃO | III. CORRELAÇÕES | IV. SUPORTE DECISÃO | V. RECOMENDAÇÕES.
DIRETRIZES: Técnico, objetivo, use hífens (-), SEM negrito/itálico.

DADOS:
`;

        anamneses.forEach((a, index) => {
            prompt += `
[Anamnese ${index + 1}] ${new Date(a.date).toLocaleDateString('pt-BR')} | ${a.professionalName} (${a.specialty})
Queixa: ${a.mainComplaint}
HDA: ${a.historyOfPresentIllness}
Avaliação: ${a.clinicalEvaluation}
`;
        });

        if (evolutions.length > 0) {
            prompt += `\n[EVOLUÇÕES]\n`;
            evolutions.forEach((e, index) => {
                prompt += `[Ev ${index + 1}] ${new Date(e.date).toLocaleDateString('pt-BR')} | ${e.professionalName}
${e.description}
${e.soap ? `SOAP: S:${e.soap.subjective} O:${e.soap.objective} A:${e.soap.assessment} P:${e.soap.plan}` : ''}
${e.metrics.length ? `Métricas: ${e.metrics.map(m => `${m.name}:${m.value}${m.unit}`).join(',')}` : ''}
`;
            });
        }

        if (examResults.length > 0) {
            prompt += `\n[EXAMES]\n`;
            examResults.forEach((r, index) => {
                prompt += `[Ex ${index + 1}] ${new Date(r.date).toLocaleDateString('pt-BR')} | ${r.examName}
Res: ${r.result}
${r.metrics?.length ? `Métricas: ${r.metrics.map(m => `${m.name}:${m.value}${m.unit}`).join(',')}` : ''}
`;
            });
        }

        if (prescriptions.length > 0) {
            prompt += `\n[PRESCRIÇÕES]\n`;
            prescriptions.forEach((p, index) => {
                prompt += `[Pr ${index + 1}] ${new Date(p.date).toLocaleDateString('pt-BR')}
Med: ${p.medications.map(m => `${m.name}(${m.dosage})`).join(', ')}
`;
            });
        }

        prompt += `\nPor favor, realize a Análise de Inteligência Clínica agora.`;

        let content = await generateWithClinicalAi({ prompt, temperature: 0.4 });

        // Remove any remaining markdown symbols
        content = content.replace(/\*\*/g, "").replace(/\*/g, "");

        return content;

    } catch (error) {
        console.error("Erro ao gerar inteligência clínica com IA:", error);
        throw new Error("Falha ao processar a solicitação com a IA.");
    }
};

/**
 * Gera uma narrativa clínica profissional para uma anamnese individual.
 * @param prompt O conjunto de dados formatado como prompt para a IA.
 * @returns O texto da narrativa clínica gerada.
 */
export const generateClinicalNarrative = async (prompt: string): Promise<string> => {
    if (!prompt || prompt.trim() === "") {
        throw new Error("Prompt vazio fornecido para geração da narrativa.");
    }

    try {
        return await generateWithClinicalAi({ prompt, temperature: 0.5 });

    } catch (error) {
        console.error("Erro ao gerar narrativa clínica com IA:", error);
        throw new Error("Falha ao processar a solicitação de narrativa com a IA.");
    }
};

