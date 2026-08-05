export interface CnpjLookupResult {
  cnpj: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const isValidCnpj = (value: string) => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
};

export const lookupCnpj = async (value: string): Promise<CnpjLookupResult> => {
  const cnpj = onlyDigits(value);
  if (!isValidCnpj(cnpj)) throw new Error('Informe um CNPJ válido para realizar a busca.');

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) throw new Error('CNPJ não encontrado na base pública.');
  if (!response.ok) throw new Error('A consulta pública está indisponível no momento. Preencha os dados manualmente.');

  const data = await response.json();
  return {
    cnpj: formatCnpj(data.cnpj || cnpj),
    name: data.nome_fantasia || data.razao_social || '',
    specialty: data.cnae_fiscal_descricao || '',
    phone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
    email: (data.email || '').toLowerCase(),
    address: {
      street: data.descricao_tipo_de_logradouro
        ? `${data.descricao_tipo_de_logradouro} ${data.logradouro || ''}`.trim()
        : data.logradouro || '',
      number: data.numero || '',
      complement: data.complemento || '',
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      zipCode: data.cep ? String(data.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') : '',
    },
  };
};
