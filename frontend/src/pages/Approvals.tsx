import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Pill } from '../components/StatusPill';
import { when } from '../lib/format';
import AssetModal from '../components/AssetModal';

const TYPE_LABEL: Record<string, string> = { ON_LOAN: 'On Loan', IN_USE: 'In Use', PROJECT: 'Project' };

/** Storekeeper/Admin review and approve or reject borrow requests from Engineers and Guests. */
export default function Approvals() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const load = () => api('/approvals').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  if (user.role !== 'ADMIN' && user.role !== 'STOREKEEPER') return <p className="text-slate-500">Only Storekeeper and Admin review borrow requests.</p>;

  async function approve(id: number) {
    setBusyId(id); setErr('');
    try { await api(`/approvals/${id}/approve`, { method: 'POST' }); await load(); } catch (e) { setErr(e.message); } finally { setBusyId(null); }
  }
  async function reject(id: number) {
    const reason = prompt('Reason for rejecting (optional):') || undefined;
    setBusyId(id); setErr('');
    try { await api(`/approvals/${id}/reject`, { body: { reason } }); await load(); } catch (e) { setErr(e.message); } finally { setBusyId(null); }
  }

  return (<>
    <p className="mb-4 text-sm text-slate-500">Every borrow request from an Engineer or General Loan borrower waits here until a Storekeeper or Admin approves it.</p>
    {err && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</p>}
    {!list.length && <p className="py-10 text-center text-slate-500">No pending requests right now.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((r) => (
        <div key={r.id} className="item flex-col items-stretch !cursor-default">
          <button className="text-left" onClick={() => setOpen(r.assetId)}>
            <span className="block font-semibold text-brand">{r.asset?.name}</span>
            <span className="block text-xs text-slate-500">{r.assetId}</span>
          </button>
          <hr className="my-2 border-slate-200" />
          <span className="text-[13px] text-slate-600"><b>{r.requestedBy}</b> ({r.requesterRole === 'GUEST' ? 'General loan' : 'Engineer'}){r.section ? `, ${r.section}` : ''}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill color="#4FA0D0">{TYPE_LABEL[r.loanType] || r.loanType}</Pill>
            {r.inspectionSite && <span className="text-xs text-slate-500">at {r.inspectionSite}</span>}
          </span>
          {r.dueBack && <span className="mt-1 block text-xs text-amber-600">Return by {when(r.dueBack)}</span>}
          {r.note && <span className="mt-1 block text-xs text-slate-500">"{r.note}"</span>}
          <span className="mt-1 block text-xs text-slate-400">Requested {when(r.createdAt)}</span>
          <div className="mt-3 flex gap-2">
            <button className="btn-finish btn-sm flex-1" disabled={busyId === r.id} onClick={() => approve(r.id)}>Approve</button>
            <button className="btn-ghost btn-sm flex-1 text-red-600" disabled={busyId === r.id} onClick={() => reject(r.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
    {open && <AssetModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
  </>);
}
