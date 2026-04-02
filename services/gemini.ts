import { GoogleGenAI } from "@google/genai";

// Inicializa o Gemini (Mantenha a inicialização)
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_GENAI_API_KEY });

const SYSTEM_INSTRUCTION = `
Você é o **"AnamneseAI"**, um especialista em coleta, estruturação e, principalmente, **SÍNTESE** de históricos clínicos (anamnese).

**OBJETIVO:** Guie a coleta inicial de dados e, em seguida, integre informações de múltiplos especialistas (Médico, Cardiologista, Ortopedista, etc.) para construir um **Perfil Clínico Integrado (Anamnese Mista)**.

REGRAS OBRIGATÓRIAS:
1. **SEJA DETALHADO E ANALÍTICO.** Ao sintetizar, identifique e destaque pontos de convergência, divergência ou omissão entre os relatórios dos diferentes profissionais.
2. Seu foco é na **criação de uma visão 360º do paciente**, consolidando Queixa Principal (QP), História da Moléstia Atual (HMA), Antecedentes Pessoais (AP) e Familiares (AF).
3. **PRIORIZE O RISCO/URGÊNCIA:** Se o usuário relatar ou se a análise de qualquer documento indicar sintomas de urgência (ex: dor no peito súbita, perda de consciência, sinais de AVC/infarto), **IMEDIATAMENTE interrompa a coleta/análise, alerte para o risco e encerre sugerindo contato humano emergencial** através deste link:

[🚨 Procure Atendimento Médico de Urgência IMEDIATA](https://api.whatsapp.com/send/?phone=5579988078887&text=URGENCIA%21+Preciso+de+orienta%C3%A7%C3%A3o+m%C3%A9dica+agora&type=phone_number&app_absent=0)

Nunca prescreva ou faça diagnóstico. Seu papel é **coletar, estruturar e integrar o histórico**.
`;

export const sendMessageToGemini = async (
  prompt: string,
  history: { role: string; content: string }[] = []
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "Não foi possível gerar uma resposta.";

    // Processamento de fontes
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const sources = groundingChunks
      .map((chunk: any) => ({
        title: chunk.web?.title,
        url: chunk.web?.uri
      }))
      .filter((s: any) => s.title && s.url)
      .map((s: any) => ({
        title: s.title as string,
        url: s.url as string
      }));

    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url, s])).values()
    );

    return { text, sources: uniqueSources as { title: string, url: string }[] };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Analisa e sintetiza múltiplos documentos de anamnese de diferentes especialistas 
 * para gerar um Laudo Clínico Misto.
 * * @param anamnesisDocs Um array de objetos, onde cada objeto contém o nome do especialista
 * e o texto bruto da anamnese/relatório.
 * @returns Um Laudo Misto e Integrado.
 */
export const synthesizeMixedAnamnesis = async (
  anamnesisDocs: { specialist: string; text: string }[]
) => {
  const allDocumentsText = anamnesisDocs.map(doc =>
    `--- RELATÓRIO DO(A) ${doc.specialist.toUpperCase()} ---\n${doc.text.slice(0, 10000)}`
  ).join('\n\n');

  const PROMPT_ANALYSIS = `
  Aja como o **"IntegratusAI"**, um especialista em análise clínica que cruza dados de diferentes fontes.

  Você recebeu múltiplos relatórios de anamnese/atendimento de diferentes profissionais de saúde para o mesmo paciente. Sua tarefa é analisar o conjunto e gerar um **LAUDO CLÍNICO MISTO E INTEGRADO** claro e conciso.

  **ESTRUTURA OBRIGATÓRIA DO LAUDO:**
  
  1. **Resumo Clínico Integrado:** Uma sinopse do perfil do paciente, destacando as principais condições, histórico e a queixa central que une os diferentes atendimentos.

  2. **Queixa Principal (QP) Unificada:** Qual é o problema central de saúde visto pelas diferentes perspectivas? Se houver mais de um, liste-os (ex: Dor articular crônica E Fadiga).

  3. **Análise de Vínculos e Discrepâncias:**
      - **Convergências (Achados Comuns):** Quais sintomas, diagnósticos ou achados se repetem em diferentes relatórios? (Ex: Todos mencionam histórico de hipertensão e tabagismo).
      - **Divergências/Lacunas:** Há informações contraditórias? Há seções importantes que um especialista omitiu (Ex: O Ortopedista não registrou o uso de medicamentos psiquiátricos, mas o Clínico sim)?

  4. **Perfil Clínico Consolidado (AP e AF):** Uma lista única de Antecedentes Pessoais (cirurgias, medicamentos, alergias) e Familiares relevantes, extraídos e confirmados pelos diferentes textos.

  5. **Conclusão e Encaminhamento Sugerido:** Baseado na síntese, qual é o próximo passo mais lógico e seguro para a jornada do paciente? Sugira o especialista ideal para a investigação final ou um plano de manejo inicial.

  DOCUMENTOS PARA ANÁLISE:
  ---
  ${allDocumentsText}
  ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: PROMPT_ANALYSIS }] }],
      config: {
        // Instrução de sistema específica para síntese de dados
        systemInstruction: 'Você é um integrador de dados clínicos. Sua saída deve ser o Laudo Clínico Misto e Integrado, usando linguagem técnica e analítica.',
      }
    });

    return response.text || "Não foi possível estruturar o laudo clínico misto.";
  } catch (error) {
    console.error("Mixed Anamnesis Synthesis Error:", error);
    throw new Error("Erro ao processar a síntese da anamnese mista com IA.");
  }
};