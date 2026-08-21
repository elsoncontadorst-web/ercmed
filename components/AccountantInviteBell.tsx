import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { acceptCompanyInvite, removeAccountantLink, watchCompanyInvites } from '../services/accountantService';
import { AccountantLink } from '../types/accountant';

const AccountantInviteBell: React.FC = () => {
  const { user, userProfile } = useUser();
  const [invites, setInvites] = useState<AccountantLink[]>([]);
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => user?.email ? watchCompanyInvites(user.email, setInvites) : undefined, [user?.email]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const respond = async (invite: AccountantLink, accepted: boolean) => {
    if (!user) return;
    setProcessing(invite.id);
    try {
      if (accepted) await acceptCompanyInvite(invite.id, user.uid, userProfile?.nomeFantasia || userProfile?.razaoSocial || userProfile?.displayName || 'Clínica', userProfile?.cnpj || userProfile?.cpf || '');
      else await removeAccountantLink(invite.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível responder ao convite.');
    } finally { setProcessing(''); }
  };

  return <div className="relative" ref={root}>
    <button type="button" onClick={() => setOpen(value => !value)} className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100" title="Convites do contador">
      <Bell className="h-5 w-5" />
      {invites.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{invites.length}</span>}
    </button>
    {open && <div className="absolute left-0 z-[90] mt-2 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="border-b bg-slate-50 px-4 py-3"><p className="font-bold text-slate-800">Convites do contador</p><p className="text-xs text-slate-500">Autorize apenas profissionais que você reconhece.</p></div>
      <div className="max-h-80 space-y-2 overflow-y-auto p-3">{invites.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">Nenhum convite pendente.</p> : invites.map(invite => <div key={invite.id} className="rounded-xl border p-3">
        <p className="font-bold text-slate-800">{invite.accountantName || 'Contador'}</p><p className="mt-1 text-xs text-slate-500">Solicitou acesso contábil aos dados desta clínica.</p>
        <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={!!processing} onClick={() => void respond(invite, true)} className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="h-4 w-4"/>Aceitar</button><button disabled={!!processing} onClick={() => void respond(invite, false)} className="flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"><X className="h-4 w-4"/>Recusar</button></div>
      </div>)}</div>
    </div>}
  </div>;
};
export default AccountantInviteBell;
