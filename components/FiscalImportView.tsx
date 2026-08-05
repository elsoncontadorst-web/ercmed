import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, FileUp, Loader2, Search, ShieldCheck, Users } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import {
  detectXmlFinancialDirection,
  getFiscalCounterparties,
  parseFiscalPdf,
  parseFiscalXml,
  saveFiscalDocument,
  syncFiscalCounterparties
} from '../services/clinicErpService';
import { FiscalCounterparty, FiscalDocument, FiscalDocumentDraft } from '../types/clinicErp';
import { getClinics } from '../services/clinicService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const taxId = (value?: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value || 'Não informado';
};

const FiscalImportView: React.FC = () => {
  const { user, userProfile } = useUser();
  const [tab, setTab] = useState<'import' | 'counterparties'>('import');
  const [draft, setDraft] = useState<FiscalDocumentDraft | null>(null);
  const [classification, setClassification] = useState<FiscalDocument['classification']>('expense');
  const [costCenter, setCostCenter] = useState('Administrativo');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [directionWarning, setDirectionWarning] = useState('');
  const [counterparties, setCounterparties] = useState<FiscalCounterparty[]>([]);
  const [search, setSearch] = useState('');

  const loadCounterparties = async () => {
    if (!user) return;
    const managerId = await getManagerIdForUser(user.uid);
    if (managerId) {
      await syncFiscalCounterparties(managerId);
      setCounterparties(await getFiscalCounterparties(managerId));
    }
  };

  useEffect(() => { void loadCounterparties(); }, [user?.uid]);

  const filteredCounterparties = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return counterparties;
    return counterparties.filter(item => `${item.name} ${item.taxId || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [counterparties, search]);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');
    setDirectionWarning('');
    try {
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const parsedDraft = await parseFiscalPdf(file);
        setDraft(parsedDraft);
        setDirectionWarning('PDF importado em modo assistido. Confira e, se necessário, corrija os dados antes de salvar. O sistema não transforma o PDF em um XML fiscal oficial.');
        return;
      }
      const xmlText = await file.text();
      const parsedDraft = parseFiscalXml(xmlText, file.name);
      const clinics = await getClinics();
      const clinicCnpjs = Array.from(new Set([
        ...clinics.map(clinic => String(clinic.cnpj || '').replace(/\D/g, '')).filter(Boolean),
        String(userProfile?.cnpj || '').replace(/\D/g, '')
      ].filter(Boolean)));
      const suggestedEntryType = detectXmlFinancialDirection(xmlText, clinicCnpjs);
      setDraft({ ...parsedDraft, suggestedEntryType });
      if (suggestedEntryType === 'income') {
        setDirectionWarning('Este XML parece ser receita da clínica. Para evitar conta a pagar incorreta, use o fluxo financeiro de receita.');
      }
    } catch (error) {
      setDraft(null);
      setMessage(error instanceof Error ? error.message : 'Não foi possível ler o documento.');
    } finally {
      event.target.value = '';
    }
  };

  const updateDraft = (field: keyof FiscalDocumentDraft, value: string | number) => {
    setDraft(current => current ? { ...current, [field]: value } : current);
  };

  const confirm = async () => {
    if (!user || !draft) return;
    if (draft.suggestedEntryType === 'income') {
      setMessage('Bloqueado: documento reconhecido como receita. Importe-o pelo fluxo financeiro de receita.');
      return;
    }
    if (!draft.totalValue || draft.totalValue <= 0) {
      setMessage('Informe um valor total válido antes de confirmar.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const managerId = await getManagerIdForUser(user.uid);
      if (!managerId) throw new Error('Clínica não identificada.');
      const clinics = await getClinics();
      const activeClinicId = getActiveClinicScopeId();
      const activeClinic = activeClinicId ? clinics.find(clinic => clinic.id === activeClinicId) : undefined;
      await saveFiscalDocument(managerId, user.uid, draft, classification, costCenter, {
        clinicId: activeClinic?.id,
        unitName: activeClinic?.name
      });
      setMessage('Documento arquivado, conta a pagar criada e cadastro fiscal atualizado.');
      setDraft(null);
      setDirectionWarning('');
      await loadCounterparties();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o documento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <FileUp className="text-brand-600" /> Documentos fiscais
        </h1>
        <p className="mt-1 text-slate-500">Importe XML ou PDF e consulte os clientes e fornecedores identificados nos documentos.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('import')} className={`border-b-2 px-4 py-3 font-semibold ${tab === 'import' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>
          Importar documento
        </button>
        <button onClick={() => setTab('counterparties')} className={`border-b-2 px-4 py-3 font-semibold ${tab === 'counterparties' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>
          Clientes e fornecedores ({counterparties.length})
        </button>
      </div>

      {tab === 'counterparties' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Users className="text-brand-600" /> Base fiscal consultável</h2>
              <p className="text-sm text-slate-500">Cadastro separado dos pacientes, atualizado automaticamente a cada documento confirmado.</p>
            </div>
            <label className="relative block sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nome, CPF ou CNPJ" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3" />
            </label>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b text-slate-500"><th className="p-3">Nome</th><th className="p-3">CPF/CNPJ</th><th className="p-3">Tipo</th><th className="p-3">Documentos</th><th className="p-3">Total movimentado</th><th className="p-3">Último documento</th></tr></thead>
              <tbody>
                {filteredCounterparties.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="p-3">{taxId(item.taxId)}</td>
                    <td className="p-3">{item.roles.map(role => role === 'customer' ? 'Cliente' : 'Fornecedor').join(' / ')}</td>
                    <td className="p-3">{item.documentCount}</td>
                    <td className="p-3 font-semibold text-brand-700">{currency(item.totalValue)}</td>
                    <td className="p-3">{item.lastDocumentAt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredCounterparties.length && <p className="py-10 text-center text-slate-500">Nenhum cadastro fiscal encontrado.</p>}
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 p-6">
            <FileSearch className="h-10 w-10 text-brand-600" />
            <h2 className="mt-4 font-bold text-slate-900">Selecionar XML ou PDF</h2>
            <p className="mt-2 text-sm text-slate-500">XML tem validação fiscal completa. PDF usa leitura assistida e exige conferência.</p>
            <label className="mt-5 block cursor-pointer rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700">
              <input type="file" accept=".xml,.pdf,text/xml,application/xml,application/pdf" onChange={selectFile} className="hidden" />
              Escolher documento
            </label>
            <div className="mt-5 rounded-lg bg-white p-3 text-xs text-slate-500"><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-600" /> Nenhum documento é baixado como pago automaticamente.</div>
            {message && <p className="mt-4 text-sm text-brand-700">{message}</p>}
            {directionWarning && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{directionWarning}</div>}
          </section>

          {draft ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{draft.sourceFormat === 'pdf' ? 'CONFERÊNCIA ASSISTIDA' : 'PRÉ-CONFERÊNCIA'}</span><h2 className="mt-3 text-xl font-bold">{draft.documentType}</h2></div>
                <strong className="text-xl text-brand-700">{currency(draft.totalValue)}</strong>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Edit label="Emissor / fornecedor" value={draft.issuerName || ''} onChange={value => updateDraft('issuerName', value)} />
                <Edit label="CPF/CNPJ do emissor" value={draft.issuerCnpj || ''} onChange={value => updateDraft('issuerCnpj', value)} />
                <Edit label="Destinatário / cliente" value={draft.recipientName || ''} onChange={value => updateDraft('recipientName', value)} />
                <Edit label="CPF/CNPJ do destinatário" value={draft.recipientCnpj || ''} onChange={value => updateDraft('recipientCnpj', value)} />
                <Edit label="Número" value={draft.number || ''} onChange={value => updateDraft('number', value)} />
                <Edit label="Data de emissão" type="date" value={draft.issuedAt || ''} onChange={value => updateDraft('issuedAt', value)} />
                <Edit label="Valor total" type="number" value={String(draft.totalValue || '')} onChange={value => updateDraft('totalValue', Number(value))} />
                <label className="text-sm font-medium text-slate-700">Classificação<select value={classification} onChange={event => setClassification(event.target.value as FiscalDocument['classification'])} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"><option value="expense">Despesa / consumo</option><option value="inventory">Estoque</option><option value="asset">Ativo imobilizado</option><option value="tax">Tributos</option></select></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Centro de custo<input value={costCenter} onChange={event => setCostCenter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" /></label>
              </div>
              <button disabled={saving || draft.suggestedEntryType === 'income'} onClick={confirm} className="mt-5 flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-bold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'Registrando...' : 'Confirmar importação'}
              </button>
            </section>
          ) : (
            <section className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 lg:col-span-2">
              <div><FileUp className="mx-auto mb-3 h-12 w-12 text-slate-200" /><p className="font-medium text-slate-700">A conferência aparecerá aqui</p><p className="mt-1 text-sm">Revise os dados antes de criar a conta financeira.</p></div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const Edit = ({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) => (
  <label className="text-sm font-medium text-slate-700">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5" /></label>
);

export default FiscalImportView;
