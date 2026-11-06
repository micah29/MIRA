import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { CATEGORIES, STATUS, calState, isLate, rel, when } from '../lib/format';
import { Pill, StatusPill } from '../components/StatusPill';
import Modal from '../components/Modal';
import AssetModal from '../components/AssetModal';
import { can, useAuth } from '../lib/auth';
import AddAssetModal from '../components/AddAssetModal';

export function whoLine(a: any) {
  switch (a.status) {
    case 'AVAILABLE': return `In store, ${a.storageLocation || 'location not set'}`;
    case 'IN_USE': return `${a.pic || 'Not recorded'}${a.section ? ', ' + a.section : ''}`;
    case 'ON_LOAN': return `${a.pic || 'Not recorded'} at ${a.inspectionSite || 'site not set'}`;
    case 'PROJECT': return a.inspectionSite || 'Client not set';
    case 'RESERVED': return `Reserved for ${a.reservedFor}`;
    case 'MAINTENANCE': return ['DAMAGED', 'BROKEN'].includes(a.condition) ? `${a.condition.toLowerCase()}, in repair` : 'Scheduled service';
    case 'LOST': return `Last held by ${a.pic || 'unknown'}`;
    default: return 'Written off';
  }
}

export default function Assets() {
  const { lookups, user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const qs = params.toString();
  const load = () => api(`/assets?${new URLSearchParams({ ...Object.fromEntries(params), ...(search ? { search } : {}) })}`).then(setList);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [qs, search]);
  const active = [...params.entries()];
  const toggle = (k: string, v: string) => { const cur = (draft[k] || '').split(',').filter(Boolean); setDraft({ ...draft, [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') }); };
  const group = (title: string, k: string, opts: [string, string][]) => (
    <details className="border-t border-slate-200 py-3" open={!!draft[k]}>
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3">{opts.map(([v, l]) => (
        <label key={v} className="flex items-center gap-2 text-sm text-brand"><input type="checkbox" className="accent-brand" checked={(draft[k] || '').split(',').includes(v)} onChange={() => toggle(k, v)} />{l}</label>))}</div>
    </details>);
  return (<>
    <div className="mb-3 flex gap-2">
      <div className="relative flex-1"><input className="input bg-slate-50 pr-10" type="search" placeholder="Search asset, holder, division, site or serial" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search assets" /></div>
      <button className="relative grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-brand" aria-label="Filter" onClick={() => { setDraft(Object.fromEntries(params)); setShowFilter(true); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        {active.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sun" />}
      </button>
      {can(user, 'store') && <button className="btn-finish" onClick={() => setAdding(true)}>+ Add asset</button>}
    </div>
    {active.length > 0 && <div className="mb-3 flex flex-wrap gap-1.5">{active.map(([k, v]) => <span key={k} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-brand">{({ status: 'Status', category: 'Category', section: 'Division', attention: 'Attention' } as any)[k] || k}: {v.replace(/,/g, ', ')}</span>)}
      <button className="text-xs text-brand underline" onClick={() => setParams({})}>Clear all</button></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((a) => { const c = calState(a); return (
        <button key={a.id} className="item" onClick={() => setOpen(a.id)}>
          <span className="flex-1 min-w-0"><span className="block font-semibold leading-tight text-brand">{a.name}</span><span className="block text-xs text-slate-500">{a.id}{a.brand ? ` — ${a.brand}` : ''}</span>
            <hr className="my-2 border-slate-200" /><span className="block text-[13px] text-slate-500">{whoLine(a)}</span>
            {a.status === 'ON_LOAN' && !isLate(a) && <span className="block text-[13px] text-amber-600">Due back {when(a.dueBack)}</span>}</span>
          <span className="flex flex-col items-end gap-1.5"><StatusPill status={a.status} />
            {isLate(a) && <Pill color="#DC2626">{rel(Date.now() - +new Date(a.dueBack))} late</Pill>}
            {c === 'expired' && <Pill color="#DC2626">Cal expired</Pill>}{c === 'soon' && <Pill color="#E08600">Cal due soon</Pill>}</span>
        </button>); })}
      {!list.length && <p className="col-span-full py-10 text-center text-slate-500">No assets match. Clear the search or remove a filter.</p>}
    </div>
    {showFilter && <Modal title="Filter" subtitle="Show only the assets you need" onClose={() => setShowFilter(false)}>
      {group('Status', 'status', Object.entries(STATUS).map(([k, v]) => [k, v.label]))}
      {group('Category', 'category', CATEGORIES.map((c) => [c, c]))}
      {group('Division', 'section', (lookups?.sections || []).map((s) => [s.name, s.name]))}
      <div className="border-t border-slate-200 py-3"><div className="mb-2 font-medium">Needs attention</div>
        <select className="input" value={draft.attention || ''} onChange={(e) => setDraft({ ...draft, attention: e.target.value })}>
          <option value="">Any</option><option value="overdue">Overdue</option><option value="damaged">Damaged</option><option value="calibration">Calibration due</option></select></div>
      <button className="btn-finish mt-3 w-full" onClick={() => { setParams(Object.fromEntries(Object.entries(draft).filter(([, v]) => v)) as any); setShowFilter(false); }}>Apply filter</button>
    </Modal>}
    {open && <AssetModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
    {adding && <AddAssetModal onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); load(); setOpen(id); }} />}
  </>);
}
