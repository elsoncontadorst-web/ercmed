import React, { useEffect, useState } from 'react';
import { Building2, BriefcaseBusiness, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { AccountType, changeOwnAccountType } from '../services/accountTypeService';

const AccountTypeSettings: React.FC = () => {
  const { userProfile, refreshUserData, isAdminMaster } = useUser();
  const current: AccountType = userProfile?.accountType === 'accountant' || (userProfile?.role as string) === 'accountant' ? 'accountant' : 'clinic';
  const roleMatchesType = selectedRoleMatches(userProfile?.role as string | undefined, current);
  const [selected, setSelected] = useState<AccountType>(current);
  const [profile, setProfile] = useState({ name: '', crc: '', officeName: '', officeCNPJ: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSelected(current);
    setProfile({
      name: userProfile?.accountantProfile?.name || userProfile?.displayName || '',
      crc: userProfile?.accountantProfile?.crc || '',
      officeName: userProfile?.accountantProfile?.officeName || '',
      officeCNPJ: userProfile?.accountantProfile?.officeCNPJ || '',
      phone: userProfile?.accountantProfile?.phone || userProfile?.telefone || '',
    });
  }, [userProfile]);

  if (isAdminMaster) return null;
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      await changeOwnAccountType(selected, selected === 'accountant' ? profile : undefined);
      await refreshUserData();
      setMessage('Tipo de conta alterado com sucesso. O menu foi atualizado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível alterar o tipo da conta.'); }
    finally { setBusy(false); }
  };

  return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-800">Tipo de conta</h2>
    <p className="mt-1 text-sm text-slate-500">Escolha o ambiente principal desta conta. A alteração não apaga seus dados.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => setSelected('clinic')} className={`rounded-xl border p-4 text-left ${selected === 'clinic' ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200'}`}><Building2 className="mb-2 h-5 w-5 text-teal-700"/><strong className="block text-slate-800">Clínica / Empresa de saúde</strong><span className="text-xs text-slate-500">Gestão clínica, financeira e operacional.</span></button>
      <button type="button" onClick={() => setSelected('accountant')} className={`rounded-xl border p-4 text-left ${selected === 'accountant' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200'}`}><BriefcaseBusiness className="mb-2 h-5 w-5 text-blue-700"/><strong className="block text-slate-800">Contador / Escritório contábil</strong><span className="text-xs text-slate-500">Convites e gestão das clínicas vinculadas.</span></button>
    </div>
    {selected === 'accountant' && <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="Nome do contador *" className="rounded-lg border p-2.5"/>
      <input value={profile.crc} onChange={e => setProfile({...profile, crc: e.target.value})} placeholder="CRC (ex.: CRC-SP 123456)" className="rounded-lg border p-2.5"/>
      <input value={profile.officeName} onChange={e => setProfile({...profile, officeName: e.target.value})} placeholder="Nome do escritório" className="rounded-lg border p-2.5"/>
      <input value={profile.officeCNPJ} onChange={e => setProfile({...profile, officeCNPJ: e.target.value})} placeholder="CNPJ do escritório" className="rounded-lg border p-2.5"/>
      <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="Telefone" className="rounded-lg border p-2.5 sm:col-span-2"/>
    </div>}
    {message && <p className={`mt-3 text-sm ${message.includes('sucesso') ? 'text-emerald-700' : 'text-rose-700'}`}>{message}</p>}
    {!roleMatchesType && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">O cadastro está parcialmente configurado. Clique abaixo para corrigir o acesso e atualizar o menu.</p>}
    <div className="mt-4 flex justify-end"><button disabled={busy || (selected === current && roleMatchesType) || (selected === 'accountant' && !profile.name.trim())} onClick={() => void save()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{!roleMatchesType ? 'Corrigir acesso da conta' : 'Salvar tipo de conta'}</button></div>
  </div>;
};
export default AccountTypeSettings;

const selectedRoleMatches = (role: string | undefined, type: AccountType) =>
  type === 'accountant' ? role === 'accountant' : ['admin_gestor', 'manager', 'admin'].includes(role || '');
