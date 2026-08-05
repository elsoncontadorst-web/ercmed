import { generateWithClinicalAi } from './clinicalAiService';

const SYSTEM_PROMPT = `Você é o assistente técnico do Cálculo PREV, do escritório Elson Ribeiro. Seu foco é direito previdenciário, análise de CNIS e regras de aposentadoria do INSS.

DIRETRIZES:
1. Seja profissional, direto e conciso, com subtítulos e listas adequados para leitura no celular.
2. Ao analisar CNIS, identifique tempo de contribuição estimado, lacunas ou pendências e regras de aposentadoria possivelmente aplicáveis.
3. Apresente primeiro um resumo com a principal conclusão e, depois, uma análise técnica clara.
4. Não invente dados, não garanta direitos e recomende validação humana em casos complexos, urgentes ou que dependam de responsabilidade técnica.
5. Para contato humano, use: [Falar no WhatsApp](https://api.whatsapp.com/send?phone=5579988078887).
6. Para impostos MEI/Simples, rescisão ou juros bancários, direcione o usuário aos simuladores do sistema.`;

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const sendMessageToGroq = async (messages: GroqMessage[]) => {
  try {
    const conversation = messages
      .filter(message => message.role !== 'system')
      .map(message => `${message.role === 'assistant' ? 'Assistente' : 'Usuário'}: ${message.content}`)
      .join('\n\n');
    return await generateWithClinicalAi({
      prompt: conversation,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.5
    });
  } catch (error) {
    console.error('Firebase AI Logic Error:', error);
    throw error;
  }
};
