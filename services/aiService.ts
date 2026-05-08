
import { Anamnesis, PatientEvolution, Prescription, ExamRequest, ExamResult } from "../types/health";

// Initialize Groq API Key
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

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
        let prompt = `
Atue como um Médico Especialista Sênior e Auditor Clínico com alta capacidade analítica.
Sua tarefa é realizar uma análise de "Inteligência Clínica Avançada" integrando todos os dados do prontuário do paciente para gerar uma Anamnese Mista (Síntese Integrada).

OBJETIVOS:
1. Consolidar anamneses de diferentes profissionais.
2. Analisar a evolução clínica temporal (piora, melhora, estabilidade).
3. Correlacionar queixas com resultados de exames e condutas médicas.
4. Identificar padrões recorrentes e sugerir possíveis diagnósticos ou comorbidades.
5. Avaliar a eficácia do tratamento (prescrições vs. evolução).

ESTRUTURA DO RELATÓRIO:
I. RESUMO INTEGRADO: Síntese coesa dos dados de todos os profissionais.
II. ANÁLISE DE EVOLUÇÃO E TENDÊNCIAS: Descrição da trajetória clínica do paciente.
III. CORRELAÇÕES CLÍNICO-LABORATORIAIS: Cruzamento entre sintomas e resultados de exames.
IV. SUPORTE À DECISÃO: Sugestão de possíveis condições clínicas e pontos de atenção.
V. RECOMENDAÇÕES: Sugestões para o plano de cuidado futuro.

DIRETRIZES:
- Mantenha um tom técnico, objetivo e profissional.
- Use hífens (-) para listas.
- NÃO use negrito (**) ou itálico (*).
- Se houver lacunas ou contradições nos dados, aponte-as.

DADOS PARA ANÁLISE:

--- ANAMNESES ---
`;

        anamneses.forEach((a, index) => {
            prompt += `
[Anamnese ${index + 1}]
Data: ${new Date(a.date).toLocaleDateString('pt-BR')} | Profissional: ${a.professionalName} (${a.specialty})
Queixa: ${a.mainComplaint}
HDA: ${a.historyOfPresentIllness}
Avaliação/Hipóteses: ${a.clinicalEvaluation}
`;
        });

        if (evolutions.length > 0) {
            prompt += `\n--- EVOLUÇÕES CLÍNICAS ---\n`;
            evolutions.forEach((e, index) => {
                prompt += `
[Evolução ${index + 1}]
Data: ${new Date(e.date).toLocaleDateString('pt-BR')} | Profissional: ${e.professionalName}
Descrição: ${e.description}
${e.soap ? `SOAP: S:${e.soap.subjective} O:${e.soap.objective} A:${e.soap.assessment} P:${e.soap.plan}` : ''}
Métricas: ${e.metrics.map(m => `${m.name}: ${m.value}${m.unit}`).join(', ')}
`;
            });
        }

        if (examResults.length > 0) {
            prompt += `\n--- RESULTADOS DE EXAMES ---\n`;
            examResults.forEach((r, index) => {
                prompt += `
[Exame ${index + 1}]
Data: ${new Date(r.date).toLocaleDateString('pt-BR')} | Exame: ${r.examName} (${r.type})
Resultado: ${r.result}
Métricas: ${r.metrics?.map(m => `${m.name}: ${m.value}${m.unit} (Ref: ${m.referenceRange || 'N/A'})`).join(', ') || 'N/A'}
`;
            });
        }

        if (prescriptions.length > 0) {
            prompt += `\n--- PRESCRIÇÕES ---\n`;
            prescriptions.forEach((p, index) => {
                prompt += `
[Prescrição ${index + 1}]
Data: ${new Date(p.date).toLocaleDateString('pt-BR')} | Profissional: ${p.professionalName}
Medicamentos: ${p.medications.map(m => `${m.name} (${m.dosage} ${m.frequency})`).join(', ')}
`;
            });
        }

        prompt += `\nPor favor, realize a Análise de Inteligência Clínica agora.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.4,
                max_tokens: 3000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API Groq: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let content = data.choices[0]?.message?.content || "";

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
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
                max_tokens: 1536 // Menor para narrativas individuais
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API Groq: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";

    } catch (error) {
        console.error("Erro ao gerar narrativa clínica com IA:", error);
        throw new Error("Falha ao processar a solicitação de narrativa com a IA.");
    }
};

