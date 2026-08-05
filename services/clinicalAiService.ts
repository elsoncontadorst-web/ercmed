import { getGenerativeModel, Part } from 'firebase/ai';
import { clinicalAI } from './firebase';

interface ClinicalAiRequest {
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: 'application/json';
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

export const generateWithClinicalAi = async (request: ClinicalAiRequest): Promise<string> => {
    const model = getGenerativeModel(clinicalAI, {
        model: 'gemini-2.0-flash',
        systemInstruction: request.systemInstruction,
        generationConfig: {
            temperature: request.temperature ?? 0.3,
            responseMimeType: request.responseMimeType
        }
    });

    const content: string | Part[] = request.inlineData
        ? [
            { text: request.prompt },
            { inlineData: { mimeType: request.inlineData.mimeType, data: request.inlineData.data } }
        ]
        : request.prompt;
    const result = await model.generateContent(content);
    const text = result.response.text().trim();
    if (!text) throw new Error('A IA não retornou uma resposta utilizável.');
    return text;
};
