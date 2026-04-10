
import { Anamnesis } from "../types/health";

// Initialize Groq API Key
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const generateClinicalSummary = async (anamneses: Anamnesis[]): Promise<string> => {
    if (!anamneses || anamneses.length === 0) {
        throw new Error("Nenhuma anamnese fornecida para geração do resumo.");
    }

    try {
        // Construct the prompt
        let prompt = `
Atue como um Médico Especialista Sênior e Auditor Clínico.
Sua tarefa é analisar as seguintes anamneses individuais de um paciente e gerar um "Resumo da Situação Clínica" (Anamnese Mista).

O objetivo é consolidar as informações de diferentes especialistas (ex: Médico, Fisioterapeuta, Nutricionista) em um único texto coeso, organizado e profissional.

Diretrizes:
1. Identifique e destaque os pontos de concordância e divergência entre os profissionais.
2. Organize o resumo por sistemas ou problemas, não apenas por data.
3. Mantenha um tom técnico e objetivo.
4. Se houver informações contraditórias, aponte-as para revisão.
5. Finalize com uma lista de "Pontos de Atenção" sugeridos.
6. IMPORTANTE: NÃO use formatação markdown como negrito (**texto**) ou itálico (*texto*). Escreva apenas o texto puro.
7. Não use asteriscos para listas, use hífens (-) ou números.

Dados das Anamneses:
`;

        anamneses.forEach((a, index) => {
            prompt += `
--- ANAMNESE ${index + 1} ---
Profissional: ${a.professionalName} (${a.specialty})
Data: ${new Date(a.date).toLocaleDateString('pt-BR')}
Queixa Principal: ${a.mainComplaint}
História da Moléstia Atual: ${a.historyOfPresentIllness}
Histórico Médico: ${a.pastMedicalHistory}
Histórico Familiar: ${a.familyHistory}
Hábitos/Social: ${a.socialHistory}
Revisão de Sistemas: ${a.reviewOfSystems}
-------------------------
`;
        });

        prompt += `
\nPor favor, gere o Resumo da Situação Clínica agora, sem usar asteriscos ou negrito.
`;

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
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API Groq: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let content = data.choices[0]?.message?.content || "";

        // Remove any remaining markdown symbols just in case
        content = content.replace(/\*\*/g, "").replace(/\*/g, "");

        return content;

    } catch (error) {
        console.error("Erro ao gerar resumo clínico com IA:", error);
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

