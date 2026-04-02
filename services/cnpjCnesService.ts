// Service for fetching CNPJ and CNES data from external APIs

export interface CNPJData {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    cnae_principal: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
    situacao_cadastral: string;
}

/**
 * Busca informações de CNPJ usando a BrasilAPI
 * https://brasilapi.com.br/docs#tag/CNPJ
 */
export const fetchCNPJData = async (cnpj: string): Promise<CNPJData | null> => {
    try {
        // Remove caracteres não numéricos
        const cleanCNPJ = cnpj.replace(/\D/g, '');

        if (cleanCNPJ.length !== 14) {
            throw new Error('CNPJ deve ter 14 dígitos');
        }

        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('CNPJ não encontrado');
            }
            throw new Error('Erro ao buscar CNPJ');
        }

        const data = await response.json();

        return {
            cnpj: data.cnpj,
            razao_social: data.razao_social || data.nome_empresarial || '',
            nome_fantasia: data.nome_fantasia || data.razao_social || '',
            cnae_principal: data.cnae_fiscal_descricao || data.cnae_fiscal?.toString() || '',
            logradouro: data.logradouro || data.descricao_tipo_logradouro + ' ' + data.logradouro || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            municipio: data.municipio || '',
            uf: data.uf || '',
            cep: data.cep || '',
            telefone: data.ddd_telefone_1 || '',
            email: data.email || '',
            situacao_cadastral: data.descricao_situacao_cadastral || ''
        };
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        return null;
    }
};

/**
 * Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX
 */
export const formatCNPJ = (cnpj: string): string => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;

    return cleaned.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    );
};

/**
 * Formata CPF para o padrão XXX.XXX.XXX-XX
 */
export const formatCPF = (cpf: string): string => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;

    return cleaned.replace(
        /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
        '$1.$2.$3-$4'
    );
};

/**
 * Valida CNPJ
 */
export const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, '');

    if (cleaned.length !== 14) return false;

    // Elimina CNPJs invalidos conhecidos
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validação dos dígitos verificadores
    let tamanho = cleaned.length - 2;
    let numeros = cleaned.substring(0, tamanho);
    const digitos = cleaned.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cleaned.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
};

/**
 * Valida CPF
 */
export const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');

    if (cleaned.length !== 11) return false;

    // Elimina CPFs invalidos conhecidos
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto === 10 || resto === 11 ? 0 : resto;

    if (digito1 !== parseInt(cleaned.charAt(9))) return false;

    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const digito10 = resto === 10 || resto === 11 ? 0 : resto;

    if (digito10 !== parseInt(cleaned.charAt(10))) return false;

    return true;
};
