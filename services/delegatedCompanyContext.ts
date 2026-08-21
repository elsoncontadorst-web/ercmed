const KEY = 'ercmed_accountant_company_context';

export type DelegatedCompanyContext = { ownerId: string; companyName: string };

export const getDelegatedCompanyContext = (): DelegatedCompanyContext | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
};

export const setDelegatedCompanyContext = (context: DelegatedCompanyContext | null) => {
  if (context) sessionStorage.setItem(KEY, JSON.stringify(context));
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('ercmed:delegated-company-changed', { detail: context }));
};
