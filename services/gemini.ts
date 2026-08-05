import { generateWithClinicalAi } from './clinicalAiService';

const SYSTEM_INSTRUCTION = `Você é o "AnamneseAI", especialista em síntese clínica.
OBJETIVO: Guie a coleta e integre dados multiprofissionais para um Perfil Clínico Integrado (Anamnese Mista).

REGRAS:
1. Identifique convergências, divergências e omissões.
2. Foco em visão 360º (QP, HMA, AP, AF).
3. Em sinais de urgência, recomende atendimento presencial imediato.
4. Não prescreva nem diagnostique. Apenas colete, estruture e integre informações.`;

const MAX_HISTORY_MESSAGES = 10;

export const sendMessageToGemini = async (
  prompt: string,
  history: { role: string; content: string }[] = []
) => {
  try {
    const conversation = history
      .slice(-MAX_HISTORY_MESSAGES)
      .map(message => `${message.role === 'user' ? 'Usuário' : 'Assistente'}: ${message.content}`)
      .join('\n\n');
    const text = await generateWithClinicalAi({
      prompt: `${conversation}${conversation ? '\n\n' : ''}Usuário: ${prompt}`,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3
    });

    return { text, sources: [] as { title: string, url: string }[] };
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

export const synthesizeMixedAnamnesis = async (
  anamnesisDocs: { specialist: string; text: string }[]
) => {
  const allDocumentsText = anamnesisDocs.map(doc =>
    `[${doc.specialist.toUpperCase()}]\n${doc.text.slice(0, 4000)}`
  ).join('\n\n');

  const prompt = `Aja como "IntegratusAI". Analise múltiplos relatórios de saúde e gere um LAUDO CLÍNICO MISTO E INTEGRADO.

ESTRUTURA:
1. Resumo Clínico: Sinopse do perfil e condições principais.
2. QP Unificada: Problema central sob diferentes perspectivas.
3. Vínculos e Discrepâncias: Convergências, divergências e lacunas.
4. Perfil Consolidado: AP e AF confirmados.
5. Conclusão: Próximo passo lógico.

DOCUMENTOS:
${allDocumentsText}`;

  try {
    return await generateWithClinicalAi({
      prompt,
      systemInstruction: 'Sua saída deve ser apenas o Laudo Clínico Misto e Integrado em linguagem técnica. Não prescreva nem diagnostique.',
      temperature: 0.3
    });
  } catch (error) {
    console.error('Mixed Anamnesis Synthesis Error:', error);
    throw new Error('Erro ao processar a síntese da anamnese mista com IA.');
  }
};

export const parseExamDocument = async (fileBase64: string, mimeType: string) => {
  const prompt = `Aja como especialista médico. Extraia dados deste exame para JSON:
  {
    "examName": "Nome",
    "type": "Laboratorial"|"Imagem"|"Outros",
    "date": "YYYY-MM-DD",
    "result": "Resumo achado principal",
    "metrics": [{ "name": "...", "value": 0, "unit": "...", "referenceRange": "..." }]
  }
  Retorne APENAS o JSON, sem markdown.`;

  try {
    const text = await generateWithClinicalAi({
      prompt,
      temperature: 0.1,
      responseMimeType: 'application/json',
      inlineData: { mimeType, data: fileBase64 }
    });
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error('Exam Parsing Error:', error);
    throw new Error('Erro ao analisar o arquivo de exame.');
  }
};
