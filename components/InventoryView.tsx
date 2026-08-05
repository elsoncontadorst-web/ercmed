import React, { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Filter, Package, Plus } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { getInventoryItems, saveInventoryItem } from '../services/inventoryService';
import { InventoryItem } from '../types/clinicErp';

const initial = {
  name: '',
  category: 'material' as const,
  unit: 'un',
  quantity: 0,
  minimumQuantity: 0,
  batch: '',
  expirationDate: '',
  averageCost: 0,
  active: true
};

const InventoryView: React.FC = () => {
  const { user } = useUser();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!user) return;
    const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
    setItems(await getInventoryItems(managerId));
  };

  useEffect(() => {
    load();
  }, [user?.uid]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !form.name.trim()) return;
    const managerId = (await getManagerIdForUser(user.uid)) || user.uid;
    await saveInventoryItem(managerId, {
      ...form,
      batch: form.batch || undefined,
      expirationDate: form.expirationDate || undefined
    });
    setForm(initial);
    setShowForm(false);
    setMessage('Item cadastrado e pronto para consumo automatico no atendimento.');
    await load();
  };

  const lowStock = items.filter(item => item.quantity <= item.minimumQuantity);
  const categories = new Set(items.map(item => item.category)).size;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            Estoque e Insumos
          </h1>
          <p className="text-slate-500">Materiais e medicamentos vinculados a producao, compras e reposicao.</p>
        </div>
        <button onClick={() => setShowForm(current => !current)} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Package className="w-5 h-5" />} tone="blue" label="Total de Itens" value={String(items.length)} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} tone="red" label="Estoque Baixo" value={String(lowStock.length)} />
        <StatCard icon={<Filter className="w-5 h-5" />} tone="green" label="Categorias" value={String(categories)} />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
          <Field label="Nome"><input required className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Categoria">
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as typeof form.category })}>
              <option value="material">Material</option>
              <option value="medication">Medicamento</option>
              <option value="supply">Insumo</option>
            </select>
          </Field>
          <Field label="Unidade"><input className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label="Quantidade"><input type="number" className="input" value={String(form.quantity)} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
          <Field label="Estoque minimo"><input type="number" className="input" value={String(form.minimumQuantity)} onChange={e => setForm({ ...form, minimumQuantity: Number(e.target.value) })} /></Field>
          <Field label="Lote"><input className="input" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} /></Field>
          <Field label="Validade"><input type="date" className="input" value={form.expirationDate} onChange={e => setForm({ ...form, expirationDate: e.target.value })} /></Field>
          <Field label="Custo medio"><input type="number" className="input" value={String(form.averageCost)} onChange={e => setForm({ ...form, averageCost: Number(e.target.value) })} /></Field>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-sm text-brand-700">{message}</p>
            <button className="rounded-lg bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">Salvar item</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_.8fr_.7fr_.7fr_.9fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Item</span>
          <span>Categoria</span>
          <span>Estoque</span>
          <span>Minimo</span>
          <span>Status</span>
        </div>
        {items.length ? items.map(item => (
          <div key={item.id} className="grid grid-cols-[1.6fr_.8fr_.7fr_.7fr_.9fr] gap-4 px-5 py-4 border-b border-slate-100 text-sm">
            <div>
              <p className="font-semibold text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">{item.batch || 'Sem lote'}{item.expirationDate ? ` · validade ${item.expirationDate}` : ''}</p>
            </div>
            <span className="text-slate-600">{item.category}</span>
            <span className="text-slate-800">{item.quantity} {item.unit}</span>
            <span className="text-slate-600">{item.minimumQuantity} {item.unit}</span>
            <span className={item.quantity <= item.minimumQuantity ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {item.quantity <= item.minimumQuantity ? 'Reposicao' : 'Ok'}
            </span>
          </div>
        )) : (
          <div className="min-h-[260px] flex flex-col items-center justify-center p-8">
            <Package className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Seu estoque esta vazio</h3>
            <p className="text-slate-500 text-center max-w-md mb-6">
              Cadastre materiais e medicamentos para consumo automatico quando o profissional finalizar o atendimento.
            </p>
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

const StatCard = ({ icon, tone, label, value }: { icon: React.ReactNode; tone: 'blue' | 'red' | 'green'; label: string; value: string }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600'
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tones[tone]}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
