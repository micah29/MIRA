import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { calState, day } from '../lib/format';
import { Pill } from '../components/StatusPill';
import AssetModal from '../components/AssetModal';

export default function Calibration() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const load = () => api('/calibrations').then(setList);
  useEffect(() => { load(); }, []);
  const cnt: any = { all: list.length, expired: 0, soon: 0, valid: 0, nodate: 0 };
  list.forEach((a) => cnt[calState(a)]++);
  const shown = list.filter((a) => f === 'all' || calState(a) === f);
  return (<>
    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><b>Calibration updates itself.</b> Record a calibration and MIRA sets the next due date from the calibration date plus the asset's interval. Assets with an expired date can't be checked out.</p>
    <div className="mb-3 flex flex-wrap gap-1.5">{[['all', 'All'], ['expired', 'Expired'], ['soon', 'Due in 30 days'], ['valid', 'Valid'], ['nodate', 'No date']].map(([k, l]) => (
      <button key={k} onClick={() => setF(k)} className={`rounded-full border px-3 py-1 text-xs ${f === k ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-brand'}`}>{l} {cnt[k]}</button>))}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map((a) => { const c = calState(a), d = a.calDue ? Math.round((+new Date(a.calDue) - Date.now()) / 864e5) : null; const last = a.calibrations?.[0];
        return (<button key={a.id} className="item" onClick={() => setOpen(a.id)}>
          <span className="flex-1"><span className="block font-semibold text-brand">{a.name}</span><span className="block text-xs text-slate-500">{a.id}, every {a.calIntervalMonths} months</span>
            <hr className="my-2 border-slate-200" /><span className="block text-[13px] text-slate-500">Due <b className="text-ink">{day(a.calDue)}</b>{last ? `, last ${day(last.calibratedAt)}` : ''}</span>
            <span className="block text-[13px] text-slate-500">With {a.pic || 'not recorded'}</span></span>
          {c === 'expired' ? <Pill color="#DC2626">Expired {-d} d ago</Pill> : c === 'soon' ? <Pill color="#E08600">Due in {d} d</Pill> : c === 'nodate' ? <Pill color="#DC2626">No date</Pill> : <Pill color="#16A34A">{d} d left</Pill>}
        </button>); })}
    </div>
    {open && <AssetModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
  </>);
}
