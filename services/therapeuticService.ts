import { generateWithClinicalAi } from './clinicalAiService';

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

export interface PatientCrossAnalysis {
  compatibilityScore: number;
  compatibilityLabel: 'ALTO RISCO' | 'ATENÇÃO' | 'COMPATÍVEL' | 'EXCELENTE';
  summary: string;
  contraindications: Array<{ item: string; reason: string; severity: 'ALTO' | 'MÉDIO' | 'BAIXO' }>;
  potentialBenefits: string[];
  monitoringRecommendations: string[];
  suggestedAdjustments: string;
}

const parseJson = <T>(text: string): T => JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as T;

export const analyzeTherapeuticIdea = async (prompt: string, patientContext?: string): Promise<TherapeuticAnalysis> => {
  const aiPrompt = `Você é um apoio informativo de inteligência biofarmacológica. Analise a hipótese terapêutica com base em evidências, sem prescrever, diagnosticar ou substituir avaliação profissional.

HIPÓTESE: "${prompt}"
${patientContext ? `\nCONTEXTO ADICIONAL: ${patientContext}` : ''}

Retorne JSON com: title, summary, activeCompounds, mechanismsOfAction, synergies, risks, evidenceLevel, suggestedProtocol e scientificSources. Em suggestedProtocol, descreva somente pontos para avaliação profissional, sem posologia individual.`;

  return parseJson<TherapeuticAnalysis>(await generateWithClinicalAi({
    prompt: aiPrompt,
    temperature: 0.3,
    responseMimeType: 'application/json'
  }));
};

export const extractSubstanceKnowledge = async (substanceName: string): Promise<TherapeuticAnalysis> =>
  analyzeTherapeuticIdea(`Forneça um dossiê sobre a substância ou planta: ${substanceName}`);

export const crossReferencePatientWithTherapy = async (
  therapyHypothesis: string,
  patientProfile: {
    name: string;
    age?: number;
    chronicConditions?: string[];
    allergies?: string[];
    currentMedications?: string[];
    bloodType?: string;
  }
): Promise<PatientCrossAnalysis> => {
  const patientSummary = [
    `Paciente: ${patientProfile.name}${patientProfile.age ? `, ${patientProfile.age} anos` : ''}`,
    patientProfile.chronicConditions?.length ? `Condições crônicas: ${patientProfile.chronicConditions.join(', ')}` : '',
    patientProfile.allergies?.length ? `Alergias conhecidas: ${patientProfile.allergies.join(', ')}` : '',
    patientProfile.currentMedications?.length ? `Medicamentos em uso: ${patientProfile.currentMedications.join(', ')}` : '',
    patientProfile.bloodType ? `Tipo sanguíneo: ${patientProfile.bloodType}` : ''
  ].filter(Boolean).join('\n');

  const aiPrompt = `Você é um apoio farmacológico informativo. Aponte possíveis pontos de atenção para revisão por profissional habilitado. Não atribua compatibilidade clínica definitiva, não prescreva e não indique ajuste de dose.

PROPOSTA TERAPÊUTICA: "${therapyHypothesis}"

PERFIL DO PACIENTE:
${patientSummary}

Retorne JSON com compatibilityScore, compatibilityLabel, summary, contraindications, potentialBenefits, monitoringRecommendations e suggestedAdjustments. O score é apenas uma triagem informativa e deve sempre recomendar validação profissional.`;

  return parseJson<PatientCrossAnalysis>(await generateWithClinicalAi({
    prompt: aiPrompt,
    temperature: 0.2,
    responseMimeType: 'application/json'
  }));
};
