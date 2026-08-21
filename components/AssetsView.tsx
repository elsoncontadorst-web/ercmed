import React, { FormEvent, useEffect, useState } from 'react';
import { Hammer, Plus, Wallet } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { getAssetItems, saveAssetItem } from '../services/assetService';
import { AssetItem } from '../types/clinicErp';

const today = new Date().toISOString().slice(0, 10);

const initial = {
  name: '',
  category: 'equipment' as AssetItem['category'],
  acquisitionDate: today,
  acquisitionValue: 0,
  usefulLifeMonths: 60,
  supplierName: '',
  status: 'active' as AssetItem['status'],
  nextMaintenanceAt: '',
  notes: ''
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const AssetsView: React.FC = () => {
  const { user } = useUser();
  const [items, setItems] = useState<AssetItem[]>([]);
  const [form, setForm] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!user) return;
    const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
    setItems(await getAssetItems(managerId));
  };

  useEffect(() => { load(); }, [user?.uid]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !form.name.trim()) return;
    const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
    await saveAssetItem(managerId, {
      ...form,
      supplierName: form.supplierName || undefined,
      nextMaintenanceAt: form.nextMaintenanceAt || undefined,
      notes: form.notes || undefined,
      createdBy: user.uid
    });
    setForm(initial);
    setShowForm(false);
    setMessage('Ativo patrimonial cadastrado com depreciação mensal calculada automaticamente.');
    await load();
  };

  const totalAssets = items.reduce((sum, item) => sum + (item.acquisitionValue || 0), 0);
  const totalBookValue = items.reduce((sum, item) => sum + (item.bookValue || 0), 0);
  const maintenance = items.filter(item => item.status === 'maintenance').length;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Hammer className="text-brand-600" />
            Patrimônio
          </h1>
          <p className="mt-1 text-slate-500">Controle equipamentos, valor contábil, depreciação e manutenção da operação de saúde.</p>
        </div>
        <button onClick={() => setShowForm(current => !current)} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" />
          Novo ativo
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Valor de aquisição" value={money(totalAssets)} />
        <StatCard label="Valor contábil atual" value={money(totalBookValue)} />
        <StatCard label="Em manutenção" value={String(maintenance)} />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
          <Field label="Nome do ativo"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Categoria">
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as AssetItem['category'] })}>
              <option value="equipment">Equipamento</option>
              <option value="furniture">Mobiliário</option>
              <option value="technology">Tecnologia</option>
              <option value="vehicle">Veículo</option>
              <option value="other">Outros</option>
            </select>
          </Field>
          <Field label="Data de aquisição"><input type="date" className="input" value={form.acquisitionDate} onChange={e => setForm({ ...form, acquisitionDate: e.target.value })} /></Field>
          <Field label="Valor de aquisição"><input type="number" className="input" value={String(form.acquisitionValue)} onChange={e => setForm({ ...form, acquisitionValue: Number(e.target.value) })} /></Field>
          <Field label="Vida útil (meses)"><input type="number" min="1" className="input" value={String(form.usefulLifeMonths)} onChange={e => setForm({ ...form, usefulLifeMonths: Math.max(1, Number(e.target.value) || 1) })} /></Field>
          <Field label="Fornecedor"><input className="input" value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as AssetItem['status'] })}>
              <option value="active">Ativo</option>
              <option value="maintenance">Em manutenção</option>
              <option value="disposed">Baixado</option>
            </select>
          </Field>
          <Field label="Próxima manutenção"><input type="date" className="input" value={form.nextMaintenanceAt} onChange={e => setForm({ ...form, nextMaintenanceAt: e.target.value })} /></Field>
          <Field label="Observações"><input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-sm text-brand-700">{message}</p>
            <button className="rounded-lg bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">Salvar ativo</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.4fr_.8fr_.8fr_.8fr_.8fr_.8fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>Ativo</span>
          <span>Categoria</span>
          <span>Aquisição</span>
          <span>Depreciação/mês</span>
          <span>Valor contábil</span>
          <span>Status</span>
        </div>
        {items.length ? items.map(item => (
          <div key={item.id} className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-4 text-sm md:grid-cols-[1.4fr_.8fr_.8fr_.8fr_.8fr_.8fr] md:gap-4 md:px-5">
            <div>
              <p className="font-semibold text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">{item.supplierName || 'Sem fornecedor'}{item.nextMaintenanceAt ? ` · manutenção ${item.nextMaintenanceAt}` : ''}</p>
            </div>
            <span className="text-slate-600"><span className="block text-[10px] uppercase text-slate-400 md:hidden">Categoria</span>{item.category}</span>
            <span className="text-slate-700"><span className="block text-[10px] uppercase text-slate-400 md:hidden">Aquisição</span>{money(item.acquisitionValue)}</span>
            <span className="text-slate-700"><span className="block text-[10px] uppercase text-slate-400 md:hidden">Depreciação/mês</span>{money(item.monthlyDepreciation)}</span>
            <span className="font-semibold text-slate-800"><span className="block text-[10px] uppercase text-slate-400 md:hidden">Valor contábil</span>{money(item.bookValue)}</span>
            <span className={item.status === 'active' ? 'font-semibold text-emerald-600' : item.status === 'maintenance' ? 'font-semibold text-amber-600' : 'font-semibold text-slate-500'}>
              {item.status === 'active' ? 'Ativo' : item.status === 'maintenance' ? 'Manutenção' : 'Baixado'}
            </span>
          </div>
        )) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
            <Wallet className="mb-4 h-14 w-14 text-slate-200" />
            <p className="font-semibold text-slate-700">Nenhum ativo patrimonial cadastrado</p>
            <p className="mt-1 text-sm text-slate-500">Equipamentos importados via XML ou lançados manualmente aparecerão aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <div className="mt-1 [&_.input]:w-full [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-slate-200 [&_.input]:p-2.5">{children}</div>
  </label>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

export default AssetsView;
