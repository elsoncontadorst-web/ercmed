import React, { useEffect, useState } from 'react';
import { Building2, MailPlus, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { inviteCompany, removeAccountantLink, resendCompanyInvite, watchAccountantLinks } from '../../services/accountantService';
import { setDelegatedCompanyContext } from '../../services/delegatedCompanyContext';
import { AccountantLink } from '../../types/accountant';

const LinkedClinicsView: React.FC<{ onOpenCompany: () => void }> = ({ onOpenCompany }) => {
  const { user, userProfile } = useUser();
  const [email, setEmail] = useState('');
  const [active, setActive] = useState<AccountantLink[]>([]);
  const [pending, setPending] = useState<AccountantLink[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const stopActive = watchAccountantLinks(user.uid, 'active', setActive);
    const stopPending = watchAccountantLinks(user.uid, 'pending', setPending);
    return () => { stopActive(); stopPending(); };
  }, [user?.uid]);

  const send = async () => {
    if (!user || !email.trim()) return;
    setBusy(true);
    try { await inviteCompany(user.uid, email, userProfile?.displayName || user.displayName || user.email || 'Contador'); setEmail(''); }
    catch (error) { alert(error instanceof Error ? error.message : 'Não foi possível enviar o convite.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5"><h2 className="font-bold text-slate-800">Clientes online</h2><p className="mb-4 text-sm text-slate-500">Convide uma clínica pelo e-mail usado no ERCMed.</p><div className="flex flex-col gap-2 sm:flex-row"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="clinica@email.com" className="min-w-0 flex-1 rounded-xl border px-4 py-2.5 outline-none focus:border-teal-500"/><button disabled={busy || !email.trim()} onClick={() => void send()} className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-bold text-white disabled:opacity-50"><MailPlus className="h-4 w-4"/>Novo cliente</button></div></div>
    {pending.length > 0 && <section><h3 className="mb-3 font-bold text-slate-700">Convites pendentes</h3><div className="space-y-2">{pending.map(link => <div key={link.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-semibold text-slate-800">{link.companyEmail}</p><p className="text-xs text-amber-600">Aguardando aceite</p></div><div className="flex gap-2"><button title="Reenviar" onClick={() => void resendCompanyInvite(link)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-4 w-4"/></button><button title="Excluir" onClick={() => void removeAccountantLink(link.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4"/></button></div></div>)}</div></section>}
    <section><h3 className="mb-3 font-bold text-slate-700">Clínicas vinculadas</h3>{active.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhuma clínica aceitou o convite ainda.</div> : <div className="grid gap-3 md:grid-cols-2">{active.map(link => <div key={link.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><Building2/></span><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800">{link.companyName}</p><p className="text-xs text-slate-500">{link.companyDocument || 'Documento não informado'}</p></div></div><button onClick={() => { if (!link.companyOwnerId) return; setDelegatedCompanyContext({ ownerId: link.companyOwnerId, companyName: link.companyName || 'Clínica' }); onOpenCompany(); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"><ExternalLink className="h-4 w-4"/>Abrir empresa</button></div>)}</div>}</section>
  </div>;
};
export default LinkedClinicsView;
