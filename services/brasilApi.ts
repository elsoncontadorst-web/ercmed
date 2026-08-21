import { CnpjData } from "../types";

export const fetchCnpjInfo = async (cnpj: string): Promise<CnpjData> => {
  // Remove formatting
  const cleanCnpj = cnpj.replace(/[^\d]/g, '');

  if (cleanCnpj.length !== 14) {
    throw new Error("CNPJ inválido. Digite 14 números.");
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("CNPJ inválido ou inexistente.");
      }
      if (response.status === 400) {
        throw new Error("CNPJ inválido ou inexistente.");
      }
      throw new Error("CNPJ inválido ou inexistente.");
    }

    return response.json();
  } catch (error: any) {
    // Se já é um erro que lançamos, repassa
    if (error.message.includes("CNPJ")) {
      throw error;
    }
    // Erro de rede ou outro erro genérico
    throw new Error("CNPJ inválido ou inexistente.");
  }
};

export interface PublicCepData {
  cep: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  city_ibge?: string;
}

export const fetchCepInfo = async (cep: string): Promise<PublicCepData> => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) throw new Error("CEP inválido. Digite 8 números.");
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
  if (!response.ok) throw new Error("CEP não encontrado na base pública.");
  return response.json();
};
