/**
 * CPF and Input Validation Utilities
 * Ensures data integrity and prevents malicious input
 */

/**
 * Validates Brazilian CPF
 * @param cpf - CPF string with or without formatting
 * @returns true if valid, false otherwise
 */
export const validateCPF = (cpf: string): boolean => {
    if (!cpf) return false;

    // Remove non-numeric characters
    cpf = cpf.replace(/[^\d]/g, '');

    // Check if has 11 digits
    if (cpf.length !== 11) return false;

    // Check if all digits are the same (invalid CPF)
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;

    return true;
};

/**
 * Validates Brazilian CNPJ
 * @param cnpj - CNPJ string with or without formatting
 * @returns true if valid, false otherwise
 */
export const validateCNPJ = (cnpj: string): boolean => {
    if (!cnpj) return false;

    cnpj = cnpj.replace(/[^\d]/g, '');

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Validate first check digit
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    // Validate second check digit
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
};

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - User input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return '';
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validates email format
 * @param email - Email string
 * @returns true if valid email format
 */
export const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates phone number (Brazilian format)
 * @param phone - Phone string
 * @returns true if valid phone format
 */
export const validatePhone = (phone: string): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
};

/**
 * Validates date is not in the future
 * @param date - Date string (YYYY-MM-DD)
 * @returns true if date is valid and not in future
 */
export const validatePastDate = (date: string): boolean => {
    if (!date) return false;
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return inputDate <= today;
};

/**
 * Validates birthdate (must be in past and person must be born)
 * @param birthdate - Birthdate string (YYYY-MM-DD)
 * @returns true if valid birthdate
 */
export const validateBirthdate = (birthdate: string): boolean => {
    if (!birthdate) return false;
    const date = new Date(birthdate);
    const today = new Date();
    const maxAge = 150; // Maximum reasonable age
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - maxAge);

    return date <= today && date >= minDate;
};

/**
 * Masks CPF for display (shows only last 4 digits)
 * @param cpf - CPF string
 * @returns Masked CPF (***.***.XXX-XX)
 */
export const maskCPF = (cpf: string): string => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/[^\d]/g, '');
    if (cleaned.length !== 11) return cpf;
    return `***.***.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
};

/**
 * Formats CPF for display
 * @param cpf - CPF string
 * @returns Formatted CPF (XXX.XXX.XXX-XX)
 */
export const formatCPF = (cpf: string): string => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/[^\d]/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Removes CPF formatting
 * @param cpf - Formatted CPF string
 * @returns Unformatted CPF (numbers only)
 */
export const unmaskCPF = (cpf: string): string => {
    return cpf.replace(/[^\d]/g, '');
};

/**
 * Formats CNPJ for display
 * @param cnpj - CNPJ string
 * @returns Formatted CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export const formatCNPJ = (cnpj: string): string => {
    if (!cnpj) return '';
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formats phone for display
 * @param phone - Phone string
 * @returns Formatted phone ((XX) XXXXX-XXXX or (XX) XXXX-XXXX)
 */
export const formatPhone = (phone: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/[^\d]/g, '');

    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return phone;
};
