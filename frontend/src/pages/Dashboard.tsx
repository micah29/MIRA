import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { can, useAuth } from '../lib/auth';
import { STATUS, calState, day, rel } from '../lib/format';
import { Pill } from '../components/StatusPill';
import AssetModal from '../components/AssetModal';

const Bars = ({ items, empty }: { items: { name: string; count: number }[]; empty: string }) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return <div className="grid grid-cols-[minmax(96px,auto)_1fr_28px] items-center gap-x-3 gap-y-2 text-sm">
    {items.map((i) => (<div key={i.name} className="contents"><span>{i.name}</span><span className="h-3 overflow-hidden rounded bg-slate-100"><i className="block h-full rounded bg-deep-energy-x" style={{ width: `${(i.count / max) * 100}%` }} /></span><b className="text-right">{i.count}</b></div>))}
  </div>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [s, setS] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => api('/dashboard/summary').then(setS);
  useEffect(() => { load(); }, []);
  if (!s) return <p className="text-slate-500">Loading…</p>;
  const st = (k: string) => s.status[k] || 0;
  const out = st('IN_USE') + st('ON_LOAN') + st('PROJECT');
  const approver = can(user, 'approve'); // Admin + Storekeeper: see calibration notice, approvals, pending count
  const K: [string, number, string, string][] = [
    ['Total assets', s.total, '', '#2A6484'], ['Available', st('AVAILABLE'), 'status=AVAILABLE', STATUS.AVAILABLE.color], ['In Use', st('IN_USE'), 'status=IN_USE', STATUS.IN_USE.color],
    ['On Loan', st('ON_LOAN'), 'status=ON_LOAN', STATUS.ON_LOAN.color], ['Project', st('PROJECT'), 'status=PROJECT', STATUS.PROJECT.color], ['Maintenance', st('MAINTENANCE'), 'status=MAINTENANCE', STATUS.MAINTENANCE.color],
    ['Damaged', s.damaged, 'attention=damaged', '#DC2626'], ['Overdue return', s.overdue, 'attention=overdue', '#DC2626'], ['Calibration due', s.calibrationDue, 'attention=calibration', '#E08600'],
  ];
  const pie = Object.keys(STATUS).map((k) => ({ k, name: STATUS[k].label, value: st(k), color: STATUS[k].color })).filter((x) => x.value);
  return (<>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-deep-energy-x p-5 text-white shadow-soft">
      <div><h2 className="text-xl font-bold text-white">Good to see you, {user.fullName.split(' ')[0]}</h2>
        <p className="text-sm opacity-90">
          {st('AVAILABLE')} assets are in the store, {out} are with people or at sites{s.overdue ? `, and ${s.overdue} loan${s.overdue > 1 ? 's are' : ' is'} overdue` : ''}.
          {approver && s.calibrationDue > 0 && <> <b>{s.calibrationDue}</b> {s.calibrationDue > 1 ? 'tools need' : 'tool needs'} calibration soon.</>}
        </p></div>
      <div className="flex gap-2">
        {approver && <Link to="/approvals" className="btn bg-emerald-500 text-white hover:bg-emerald-600">Approval List{s.pendingApprovals > 0 ? ` (${s.pendingApprovals})` : ''}</Link>}
        <Link to="/scan" className="btn-back">Scan an asset</Link><Link to="/assets" className="btn bg-white/20 text-white">Open asset list</Link>
      </div>
    </div>
    {s.overdueList.map((a) => (
      <div key={a.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
        <span className="flex-1"><b>{a.name} ({a.id})</b> is {rel(Date.now() - +new Date(a.dueBack))} overdue. Held by {a.pic || 'unknown'} at {a.inspectionSite || '-'}.</span>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(a.id)}>Open</button></div>))}
    {s.expiredList.map((a) => (
      <div key={a.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
        <span className="flex-1"><b>{a.name} ({a.id})</b> calibration expired. Check-out is blocked.</span><button className="btn-back btn-sm" onClick={() => setOpen(a.id)}>Record calibration</button></div>))}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {K.map(([l, v, q, c]) => (
        <button key={l} onClick={() => nav(`/assets${q ? '?' + q : ''}`)} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-soft hover:border-sky">
          <span className="flex items-center gap-2 text-[13px] text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
          <span className={`font-head text-3xl font-bold ${(l === 'Damaged' || l === 'Overdue return') && v ? 'text-red-600' : ''}`}>{v}</span>
        </button>))}
      {approver && (
        <Link to="/approvals" className="flex flex-col items-start justify-center gap-1 rounded-2xl bg-emerald-500 p-4 text-left text-white shadow-soft hover:bg-emerald-600">
          <span className="text-[13px] opacity-90">Pending approvals</span>
          <span className="font-head text-3xl font-bold text-white">{s.pendingApprovals}</span>
        </Link>)}
    </div>
    {/* 3-column layout: each column stacks its two cards directly, no gap between unrelated rows. */}
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4">
        <div className="card"><h3 className="mb-3 text-base font-bold">Asset status</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-36 w-36"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={44} outerRadius={66} stroke="none">{pie.map((p) => <Cell key={p.k} fill={p.color} />)}</Pie></PieChart></ResponsiveContainer></div>
            <ul className="flex-1 text-sm">{pie.map((p) => <li key={p.k} className="flex justify-between py-0.5"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{p.name}</span><b>{p.value}</b></li>)}</ul>
          </div></div>
        <div className="card"><h3 className="mb-3 text-base font-bold">Held by division</h3><Bars items={s.bySection} empty="Nothing is out right now." /></div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="card"><h3 className="mb-3 text-base font-bold">Assets by category</h3><Bars items={s.byCategory} empty="No assets yet." /></div>
        <div className="card"><h3 className="mb-3 text-base font-bold">On loan or deployed, by site</h3><Bars items={s.bySite} empty="Nothing is on loan or deployed." /></div>
      </div>
      <div className="card flex flex-col"><h3 className="mb-3 text-base font-bold">Next calibrations</h3>
        {s.nextCalibrations.map((a) => (<button key={a.id} className="item mb-2 py-2.5 shadow-none" onClick={() => setOpen(a.id)}>
          <span className="flex-1"><span className="block font-semibold text-brand">{a.name}</span><span className="text-xs text-slate-500">{a.id}</span></span>
          {calState(a) === 'expired' ? <Pill color="#DC2626">Expired</Pill> : calState(a) === 'soon' ? <Pill color="#E08600">{day(a.calDue)}</Pill> : <Pill color="#16A34A">{day(a.calDue)}</Pill>}</button>))}
        <Link to="/calibration" className="btn-back btn-sm mt-auto w-full">Open calibration</Link></div>
    </div>
    {open && <AssetModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
  </>);
}
