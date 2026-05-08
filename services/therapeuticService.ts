import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_GENAI_API_KEY || "" });

export interface TherapeuticAnalysis {
  title: string;
  summary: string;
  activeCompounds: string[];
  mechanismsOfAction: string[];
  synergies: string[];
  risks: string[];
  evidenceLevel: string;
  suggestedProtocol: string;
  scientificSources: string[];
}

/**
 * AI-driven analysis of a therapeutic idea, combining pharmacology, phytotherapy and clinical evidence.
 */
export const analyzeTherapeuticIdea = async (prompt: string, patientContext?: string): Promise<TherapeuticAnalysis> => {
  try {
    const aiPrompt = `
      Você é um Motor de Inteligência Biofarmacológica e Terapêutica Avançada.
      Sua tarefa é analisar a seguinte proposta/pergunta terapêutica: "${prompt}"
      
      ${patientContext ? `Considere o seguinte contexto do paciente: ${patientContext}` : ''}
      
      Realize uma varredura mental em bases como PubMed, SciELO, NIH e pesquisas de universidades federais (como a UFS para fitoterápicos).
      
      Retorne uma análise técnica estruturada em JSON com os seguintes campos:
      - title: Título da análise
      - summary: Resumo executivo da viabilidade clínica
      - activeCompounds: Lista de princípios ativos envolvidos
      - mechanismsOfAction: Como a substância age no organismo (ex: receptores, canais iônicos)
      - synergies: Combinações positivas (ex: Curcumina + Piperina)
      - risks: Interações medicamentosas adversas e contraindicações
      - evidenceLevel: Nível de evidência (A, B, C ou D) baseado em critérios Oxford
      - suggestedProtocol: Sugestão de posologia, forma de uso ou protocolo experimental
      - scientificSources: Referências bibliográficas (reais ou altamente prováveis baseadas na literatura atual)

      IMPORTANTE: Responda APENAS o JSON, sem markdown ou explicações extras.
    `;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: aiPrompt }] }]
    });

    const response = await result.response;
    const text = response.text();
    
    // Clean JSON string
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson) as TherapeuticAnalysis;
  } catch (error) {
    console.error("Error in therapeutic analysis:", error);
    throw new Error("Falha ao processar análise terapêutica inteligente.");
  }
};

/**
 * Searches and extracts knowledge about a specific plant or drug.
 */
export const extractSubstanceKnowledge = async (substanceName: string): Promise<TherapeuticAnalysis> => {
  return analyzeTherapeuticIdea(`Forneça um dossiê completo sobre a substância ou planta: ${substanceName}`);
};
