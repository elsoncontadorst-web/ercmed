// Brazilian data formatters for ERCMed platform

/**
 * Format CPF: 000.000.000-00
 */
export const formatCPF = (cpf: string | undefined): string => {
    if (!cpf) return '';

    // Remove non-numeric characters
    const numbers = cpf.replace(/\D/g, '');

    // Apply CPF mask
    if (numbers.length <= 11) {
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    return numbers.slice(0, 11)
        .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Format CNPJ: 00.000.000/0001-00
 */
export const formatCNPJ = (cnpj: string | undefined): string => {
    if (!cnpj) return '';

    // Remove non-numeric characters
    const numbers = cnpj.replace(/\D/g, '');

    // Apply CNPJ mask
    if (numbers.length <= 14) {
        return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    return numbers.slice(0, 14)
        .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Format Currency: R$ 1.000,00
 */
export const formatCurrency = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return 'R$ 0,00';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numValue);
};

/**
 * Format Phone: (00) 00000-0000 or (00) 0000-0000
 */
export const formatPhone = (phone: string | undefined): string => {
    if (!phone) return '';

    // Remove non-numeric characters
    const numbers = phone.replace(/\D/g, '');

    // Apply phone mask based on length
    if (numbers.length <= 10) {
        // Landline: (00) 0000-0000
        return numbers
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    } else {
        // Mobile: (00) 00000-0000
        return numbers.slice(0, 11)
            .replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
};

/**
 * Format CEP: 00000-000
 */
export const formatCEP = (cep: string | undefined): string => {
    if (!cep) return '';

    const numbers = cep.replace(/\D/g, '');

    return numbers.slice(0, 8).replace(/(\d{5})(\d{1,3})/, '$1-$2');
};

/**
 * Format Date to Brazilian format: dd/mm/yyyy
 */
export const formatDateBR = (date: string | Date | undefined): string => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '';

    return dateObj.toLocaleDateString('pt-BR');
};

/**
 * Format DateTime to Brazilian format: dd/mm/yyyy HH:mm
 */
export const formatDateTimeBR = (date: string | Date | undefined): string => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '';

    return dateObj.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (value: string): number => {
    if (!value) return 0;

    // Remove R$, dots, and replace comma with dot
    const cleaned = value
        .replace(/R\$\s?/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    return parseFloat(cleaned) || 0;
};

/**
 * Validate CPF
 */
export const validateCPF = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '');

    if (numbers.length !== 11) return false;

    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(numbers)) return false;

    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;
    if (checkDigit !== parseInt(numbers.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;
    if (checkDigit !== parseInt(numbers.charAt(10))) return false;

    return true;
};

/**
 * Validate CNPJ
 */
export const validateCNPJ = (cnpj: string): boolean => {
    const numbers = cnpj.replace(/\D/g, '');

    if (numbers.length !== 14) return false;

    // Check if all digits are the same
    if (/^(\d)\1{13}$/.test(numbers)) return false;

    // Validate check digits
    let length = numbers.length - 2;
    let nums = numbers.substring(0, length);
    const digits = numbers.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(nums.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    length = length + 1;
    nums = numbers.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(nums.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
};
