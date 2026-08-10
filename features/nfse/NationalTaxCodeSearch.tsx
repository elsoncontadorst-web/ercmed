import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { NATIONAL_TAX_CODES } from './nationalTaxCodes';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const NationalTaxCodeSearch = ({ value, onChange, className }: { value: string; onChange: (code: string) => void; className: string }) => {
    const selected = NATIONAL_TAX_CODES.find(item => item.code === value);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const results = useMemo(() => {
        const term = normalize(query);
        if (!term) return NATIONAL_TAX_CODES.slice(0, 50);
        return NATIONAL_TAX_CODES.filter(item => normalize(`${item.code} ${item.description}`).includes(term)).slice(0, 50);
    }, [query]);
    const choose = (code: string) => { onChange(code); setQuery(''); setOpen(false); };

    return <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 z-10 text-slate-400" size={17}/>
        <input className={`${className} pl-10`} value={open ? query : selected ? `${selected.code} — ${selected.description}` : query} placeholder="Digite o código ou nome do serviço" onFocus={() => { setQuery(''); setOpen(true); }} onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={event => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); choose(results[0].code); } if (event.key === 'Escape') setOpen(false); }} onBlur={() => window.setTimeout(() => setOpen(false), 150)} autoComplete="off" role="combobox" aria-expanded={open}/>
        {open && <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {results.length ? results.map(item => <button key={item.code} type="button" onMouseDown={() => choose(item.code)} className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50"><span className="mt-0.5 w-4 shrink-0">{item.code === value && <Check size={15} className="text-emerald-600"/>}</span><span><b>{item.code}</b> — {item.description}</span></button>) : <p className="px-3 py-4 text-sm text-slate-500">Nenhum serviço encontrado.</p>}
            {results.length === 50 && <p className="border-t px-3 py-2 text-xs text-slate-400">Continue digitando para refinar a busca.</p>}
        </div>}
    </div>;
};
