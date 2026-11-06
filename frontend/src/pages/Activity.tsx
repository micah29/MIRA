import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ACTION, when } from '../lib/format';
import AssetModal from '../components/AssetModal';

export default function Activity() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { user } = useAuth();
  const canAll = user.role === 'ADMIN' || user.role === 'STOREKEEPER';
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  useEffect(() => { const t = setTimeout(() => api(`/transactions?${new URLSearchParams({ scope, ...(q ? { search: q } : {}) })}`).then(setList), 250); return () => clearTimeout(t); }, [q, scope]);
  return (<>
    <div className="mb-3 flex flex-wrap gap-2">
      <input className="input flex-1 bg-slate-50" type="search" placeholder="Search activity" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity" />
      {canAll && <div className="flex overflow-hidden rounded-lg border border-slate-200">
        {(['mine', 'all'] as const).map((k) => <button key={k} onClick={() => setScope(k)} className={`px-4 text-sm font-medium ${scope === k ? 'bg-brand text-white' : 'bg-white text-brand'}`}>{k === 'mine' ? 'My activity' : 'All activity'}</button>)}
      </div>}
    </div>
    {!list.length && <p className="py-10 text-center text-slate-500">{scope === 'mine' ? 'No activity linked to your account yet. Activity appears here when you borrow, return or record something.' : 'No activity found.'}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((t) => (
      <button key={t.id} className="item" onClick={() => setOpen(t.assetId)}>
        <span className="flex-1"><span className="block font-semibold text-brand">{t.asset?.name}</span><span className="block text-xs text-slate-500">{t.assetId}</span>
          <hr className="my-2 border-slate-200" />
          {(t.fromPic || t.toPic) && <span className="block text-[13px] text-slate-500">{t.fromPic ? `${t.fromPic} → ` : ''}{t.toPic}</span>}
          {t.note && <span className="block text-[13px] text-slate-500">{t.note}</span>}
          <span className="block text-[13px] text-amber-600">{when(t.createdAt)}{t.recordedBy ? `, by ${t.recordedBy}` : ''}</span></span>
        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-brand">{ACTION[t.action] || t.action}</span>
      </button>))}</div>
    {open && <AssetModal id={open} onClose={() => setOpen(null)} />}
  </>);
}
