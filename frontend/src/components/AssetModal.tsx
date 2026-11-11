import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from './Modal';
import AddAssetModal from './AddAssetModal';
import { Pill, StatusPill } from './StatusPill';
import { api } from '../lib/api';
import { can, useAuth } from '../lib/auth';
import { ACTION, addMonths, calState, day, isLate, isOut, rel, when } from '../lib/format';

type View = 'detail' | 'out1' | 'out2' | 'in' | 'cal' | 'reserve' | 'edit';

/** Local YYYY-MM-DD for date inputs. */
const ymdLocal = (d: Date) => d.toLocaleDateString('en-CA');
/** Return date picked on the calendar; the tool is due back at 17:00 that day. */
const dueOn = (dateStr: string) => new Date(dateStr + 'T17:00:00');

export default function AssetModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const { user, lookups } = useAuth();
  const [a, setA] = useState<any>(null);
  const [view, setView] = useState<View>('detail');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({ type: 'ON_LOAN', pic: '', section: '', site: '', due: ymdLocal(new Date(Date.now() + 3 * 864e5)), note: '', cond: 'GOOD', calDate: new Date().toISOString().slice(0, 10), interval: 12, vendor: '', cert: '', result: 'ACCEPT', file: null });
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  const load = () => api(`/assets/${encodeURIComponent(id)}`).then((x) => { setA(x); set('interval', x.calIntervalMonths || 12); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function run(fn: () => Promise<any>) {
    setBusy(true); setErr('');
    try { await fn(); await load(); onChanged?.(); setView('detail'); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  if (!a) return <Modal title="Loading…" onClose={onClose}>{err && <p className="text-red-600">{err}</p>}</Modal>;

  const c = calState(a), blocked = c === 'expired', fresh = a.status === 'AVAILABLE' || a.status === 'RESERVED';
  const people = lookups?.people || [];
  const onPerson = (v: string) => { set('pic', v); const p = people.find((x) => x.name === v); if (p?.section) set('section', p.section); };
  const Err = () => (err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null);
  const guest = user.role === 'GUEST';

  if (view === 'out1' || view === 'out2') {
    const requestOnly = can(user, 'request') && !can(user, 'store');
    const title = requestOnly ? (fresh ? 'Request to borrow' : 'Request reassign') : (fresh ? 'Check out' : 'Reassign');
    return (
      <Modal title={title} subtitle={`${a.name} (${a.id})`} onClose={onClose}>
        <div className="mb-4 flex gap-1.5"><i className="h-1 flex-1 rounded bg-sky" /><i className={`h-1 flex-1 rounded ${view === 'out2' ? 'bg-sky' : 'bg-slate-200'}`} /></div>
        {view === 'out1' ? (<>
          {guest ? <p className="mb-4 rounded-lg bg-sky-50 p-3 text-sm text-brand">General loan: the tool is lent to you until the return date you choose. You'll get an email reminder if it's late.</p> : <>
          <label className="label">Type</label>
          <div className="mb-1 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200">
            {[['ON_LOAN', 'On Loan'], ['IN_USE', 'In Use'], ['PROJECT', 'Project']].map(([v, l]) => (
              <button key={v} className={`py-2.5 text-sm font-medium ${f.type === v ? 'bg-brand text-white' : 'bg-white'}`} onClick={() => set('type', v)}>{l}</button>))}
          </div>
          <p className="mb-4 text-xs text-slate-500">{{ ON_LOAN: 'Borrowed for a job. Needs a return date; overdue reminders go to the holder.', IN_USE: 'Assigned long-term to one person. No return date.', PROJECT: 'Deployed at a client site. No return date.' }[f.type]}</p></>}
          <label className="label" htmlFor="pic">Person (PIC)</label>
          <input id="pic" className="input mb-4" list="people" value={f.pic} readOnly={guest || requestOnly} onChange={(e) => onPerson(e.target.value)} placeholder="e.g. Rizky Budiman" />
          <datalist id="people">{people.map((p) => <option key={p.name} value={p.name} />)}</datalist>
          <label className="label" htmlFor="sec">{guest ? 'Division / company' : 'Division'}</label>
          {guest
            ? <input id="sec" className="input" value={f.section} onChange={(e) => set('section', e.target.value)} placeholder="e.g. Finance, Operation, PT Vendor" />
            : <select id="sec" className="input" value={f.section} onChange={(e) => set('section', e.target.value)}>
                <option value="">Choose a division</option>{lookups?.sections.map((s) => <option key={s.name}>{s.name}</option>)}
              </select>}
          <Err />
          <div className="mt-5 flex justify-between"><button className="btn-back" onClick={() => setView('detail')}>Back</button>
            <button className="btn-next" onClick={() => { if (!f.pic || !f.section) return setErr('Add the person and division to continue.'); setErr(''); setView('out2'); }}>Next</button></div>
        </>) : (<>
          <label className="label" htmlFor="site">Inspection site{f.type === 'IN_USE' ? ' (optional)' : ''}</label>
          <input id="site" className="input mb-4" list="sites" value={f.site} onChange={(e) => set('site', e.target.value)} placeholder="Client or site name" />
          <datalist id="sites">{lookups?.sites.map((s) => <option key={s.name} value={s.name} />)}</datalist>
          {f.type === 'ON_LOAN' && (<><label className="label" htmlFor="due">Return date</label>
            <input id="due" type="date" className="input" min={ymdLocal(new Date())} value={f.due} onChange={(e) => set('due', e.target.value)} />
            <p className="mb-4 mt-1 text-xs text-slate-500">Due back by 17:00 on {f.due ? day(dueOn(f.due)) : '—'}.</p></>)}
          <label className="label" htmlFor="note">Job or note</label>
          <textarea id="note" className="input" rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Insulation test, inverter room" />
          <Err />
          <div className="mt-5 flex justify-between"><button className="btn-back" onClick={() => setView('out1')}>Back</button>
            <button className="btn-finish" disabled={busy} onClick={() => {
              if (f.type !== 'IN_USE' && !f.site) return setErr('Add the inspection site to continue.');
              if (f.type === 'ON_LOAN' && (!f.due || dueOn(f.due).getTime() <= Date.now())) return setErr('Pick a return date in the future (due back by 17:00).');
              const body = { type: f.type, pic: f.pic, section: f.section, inspectionSite: f.site || undefined, dueBack: f.type === 'ON_LOAN' ? dueOn(f.due).toISOString() : undefined, note: f.note || undefined };
              if (requestOnly) run(() => api(`/assets/${a.id}/request`, { body }));
              else run(() => api(`/assets/${a.id}/checkout`, { body }));
            }}>{requestOnly ? 'Send request' : 'Finish'}</button></div>
        </>)}
      </Modal>
    );
  }

  if (view === 'edit') return <AddAssetModal asset={a} onClose={() => setView('detail')} onCreated={async () => { await load(); onChanged?.(); setView('detail'); }} />;

  if (view === 'in') return (
    <Modal title="Check in" subtitle={`${a.name} (${a.id}) from ${a.pic || 'holder'}`} onClose={onClose}>
      <label className="label">Condition on return</label>
      <div className="mb-1 flex flex-wrap gap-5">
        {[['GOOD', 'Good', 'text-green-600'], ['FAIR', 'Fair', 'text-green-600'], ['DAMAGED', 'Damaged', 'text-red-600'], ['BROKEN', 'Broken', 'text-red-600']].map(([v, l, cl]) => (
          <label key={v} className={`flex items-center gap-2 text-sm ${cl}`}><input type="radio" checked={f.cond === v} onChange={() => set('cond', v)} className="h-4 w-4 accent-brand" />{l}</label>))}
      </div>
      <p className="mb-4 text-xs text-slate-500">Damaged or Broken sends the asset to maintenance and alerts the storekeeper.</p>
      <label className="label" htmlFor="cinote">Note</label>
      <textarea id="cinote" className="input" rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="What's wrong, if anything" />
      <Err />
      <div className="mt-5 flex justify-between"><button className="btn-back" onClick={() => setView('detail')}>Cancel</button>
        <button className="btn-finish" disabled={busy} onClick={() => run(() => api(`/assets/${a.id}/checkin`, { body: { condition: f.cond, note: f.note || undefined } }))}>Check in to Storekeeper</button></div>
    </Modal>
  );

  if (view === 'reserve') return (
    <Modal title="Reserve" subtitle={`${a.name} (${a.id})`} onClose={onClose}>
      <label className="label" htmlFor="rp">Reserved for</label>
      <input id="rp" className="input mb-4" list="people" value={f.pic} readOnly={guest} onChange={(e) => onPerson(e.target.value)} />
      <datalist id="people">{people.map((p) => <option key={p.name} value={p.name} />)}</datalist>
      <label className="label" htmlFor="rs">{guest ? 'Division / company' : 'Division'}</label>
      {guest
        ? <input id="rs" className="input" value={f.section} onChange={(e) => set('section', e.target.value)} placeholder="e.g. Finance, Operation, PT Vendor" />
        : <select id="rs" className="input" value={f.section} onChange={(e) => set('section', e.target.value)}><option value="">Choose a division</option>{lookups?.sections.map((s) => <option key={s.name}>{s.name}</option>)}</select>}
      <Err />
      <div className="mt-5 flex justify-between"><button className="btn-back" onClick={() => setView('detail')}>Cancel</button>
        <button className="btn-next" disabled={busy} onClick={() => f.pic ? run(() => api(`/assets/${a.id}/reserve`, { body: { person: f.pic, section: f.section || undefined } })) : setErr('Add the person.')}>Save</button></div>
    </Modal>
  );

  if (view === 'cal') {
    const next = f.calDate ? addMonths(new Date(f.calDate + 'T12:00'), +f.interval) : null;
    return (
      <Modal title="Record calibration" subtitle={`${a.name} (${a.id})`} onClose={onClose}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="cd">Calibration date</label><input id="cd" type="date" className="input" max={new Date().toISOString().slice(0, 10)} value={f.calDate} onChange={(e) => set('calDate', e.target.value)} /></div>
          <div><label className="label" htmlFor="ci">Interval</label><select id="ci" className="input" value={f.interval} onChange={(e) => set('interval', +e.target.value)}>{[6, 12, 24, 36].map((m) => <option key={m} value={m}>Every {m} months</option>)}</select></div>
        </div>
        <label className="label mt-3" htmlFor="cv">Vendor or lab</label><input id="cv" className="input" value={f.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="e.g. PT Kalibrasi Instrumen Indonesia" />
        <label className="label mt-3" htmlFor="cc">Certificate number</label><input id="cc" className="input" value={f.cert} onChange={(e) => set('cert', e.target.value)} placeholder="e.g. CAL/2026/10/0182" />
        <label className="label mt-3">Result</label>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2 text-green-600"><input type="radio" className="h-4 w-4 accent-brand" checked={f.result === 'ACCEPT'} onChange={() => set('result', 'ACCEPT')} />Accept</label>
          <label className="flex items-center gap-2 text-red-600"><input type="radio" className="h-4 w-4 accent-brand" checked={f.result === 'REJECT'} onChange={() => set('result', 'REJECT')} />Reject</label>
        </div>
        <label className="label mt-3">Certificate file</label>
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          {f.file ? f.file.name : 'Click to upload the certificate (PDF or photo)'}
          <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => set('file', e.target.files?.[0] || null)} />
        </label>
        <div className={`mt-4 rounded-xl p-4 text-white ${f.result === 'ACCEPT' ? 'bg-deep-energy-x' : 'bg-red-700'}`}>
          {f.result === 'ACCEPT'
            ? <><div className="text-xs opacity-85">Next calibration due, set automatically</div><div className="font-head text-2xl font-bold text-white">{next ? day(next) : 'Pick a date'}</div><div className="text-xs opacity-85">{a.calDue ? `Replaces ${day(a.calDue)}` : 'First due date for this asset'}</div></>
            : <><div className="font-head text-xl font-bold text-white">Not renewed</div><div className="text-xs opacity-85">The asset moves to maintenance and stays blocked from check-out.</div></>}
        </div>
        <Err />
        <div className="mt-5 flex justify-between"><button className="btn-back" onClick={() => setView('detail')}>Cancel</button>
          <button className="btn-next" disabled={busy} onClick={() => {
            const fd = new FormData();
            fd.append('calibratedAt', new Date(f.calDate + 'T12:00').toISOString()); fd.append('intervalMonths', String(f.interval)); fd.append('result', f.result);
            if (f.vendor) fd.append('vendor', f.vendor); if (f.cert) fd.append('certificateNo', f.cert); if (f.file) fd.append('file', f.file);
            run(() => api(`/assets/${a.id}/calibrations`, { form: fd }));
          }}>Save calibration</button></div>
      </Modal>
    );
  }

  const borrow = can(user, 'borrow'), store = can(user, 'store'), requestOnly = can(user, 'request'), lend = store; // direct check-out/reassign: Storekeeper+Admin only
  const pending = a.borrowRequests?.[0] || null;
  const myPending = pending && pending.requestedByEmail && pending.requestedByEmail.toLowerCase() === user.email?.toLowerCase();
  const kv = (k: string, v: any) => (<><dt className="kv-k">{k}</dt><dd className="kv-v">{v}</dd></>);
  async function decide(approveIt: boolean) {
    setBusy(true); setErr('');
    try {
      if (approveIt) await api(`/approvals/${pending.id}/approve`, { method: 'POST' });
      else await api(`/approvals/${pending.id}/reject`, { body: {} });
      await load(); onChanged?.();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={a.name} subtitle={`${a.id} — Asset details`} onClose={onClose}>
      <div className="flex gap-4">
        <dl className="flex-1">
          {kv('Status', <span className="flex flex-wrap gap-1.5"><StatusPill status={a.status} />{isLate(a) && <Pill color="#DC2626">{rel(Date.now() - +new Date(a.dueBack))} overdue</Pill>}</span>)}
          {kv('Held by (PIC)', <><b className="font-medium text-ink">{a.pic || 'Not recorded'}</b>{a.section ? `, ${a.section}` : ''}</>)}
          {a.status === 'ON_LOAN' && kv('Due back', when(a.dueBack))}
          {a.status === 'RESERVED' && kv('Reserved for', a.reservedFor)}
          {kv('Current location', `${a.currentLocation || '-'} (storage: ${a.storageLocation || 'not set'})`)}
          {kv(isOut(a.status) ? 'Inspection site' : 'Last inspection site', a.inspectionSite || 'None')}
          {kv('Device', [a.brand, a.model].filter(Boolean).join(' ') + (a.serialNumber ? `, SN ${a.serialNumber}` : '') || '-')}
          {kv('Condition', a.condition)}
          {kv('Calibration due', a.calDue ? `${day(a.calDue)} (every ${a.calIntervalMonths} months)` : a.calRequired ? 'Required, no date' : 'Not required')}
        </dl>
        <div className="self-start rounded-lg border border-slate-200 bg-white p-1.5"><QRCodeSVG value={a.id} size={84} /></div>
      </div>
      {a.calibrations?.[0] && (() => { const c = a.calibrations[0]; return (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="kv-k">Last calibration</div>
          <div className="text-sm text-slate-600">{day(c.calibratedAt)}, {c.result === 'ACCEPT' ? 'accepted' : 'rejected'}{c.vendor ? `, ${c.vendor}` : ''}{c.certificateNo ? `, certificate ${c.certificateNo}` : ''}</div>
          {c.certificateFile
            ? <a className="btn-ghost btn-sm mt-2" href={`/api/files/${c.certificateFile}`} target="_blank" rel="noreferrer">View certificate (PDF)</a>
            : <div className="mt-1 text-xs text-slate-400">No certificate file uploaded</div>}
        </div>); })()}
      {pending && (
        <div className={`mt-3 rounded-xl border p-3 text-sm ${can(user, 'approve') ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-brand'}`}>
          {can(user, 'approve')
            ? <><p className="mb-2"><b>{pending.requestedBy}</b> ({pending.requesterRole === 'GUEST' ? 'General loan' : 'Engineer'}) requested to borrow this asset{pending.inspectionSite ? `, for ${pending.inspectionSite}` : ''}. Waiting for your decision.</p>
                <div className="flex gap-2"><button className="btn-finish btn-sm" disabled={busy} onClick={() => decide(true)}>Approve</button><button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={() => decide(false)}>Reject</button></div></>
            : myPending ? 'Your request to borrow this asset is waiting for approval.' : `A request for this asset by ${pending.requestedBy} is waiting for approval.`}
        </div>)}
      {blocked && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Calibration has expired. Record a new calibration before this asset can be checked out or reassigned.</p>}
      <Err />
      <div className="mt-4 flex flex-wrap gap-2">
        {fresh && !pending && lend && <button className="btn-finish" disabled={blocked} onClick={() => { set('pic', a.reservedFor || ''); set('section', a.reservedSection || ''); setView('out1'); }}>Check out</button>}
        {fresh && !pending && requestOnly && !lend && <button className="btn-finish" disabled={blocked} onClick={() => { set('pic', user.fullName); set('section', people.find((p) => p.name === user.fullName)?.section || ''); setView('out1'); }}>Request to borrow</button>}
        {a.status === 'AVAILABLE' && !pending && (lend || requestOnly) && <button className="btn-ghost" onClick={() => { if (guest) set('pic', user.fullName); setView('reserve'); }}>Reserve</button>}
        {a.status === 'RESERVED' && (borrow || requestOnly) && <button className="btn-ghost" disabled={busy} onClick={() => run(() => api(`/assets/${a.id}/cancel-reservation`, { method: 'POST' }))}>Cancel reservation</button>}
        {isOut(a.status) && store && <button className="btn-finish" onClick={() => setView('in')}>Check in</button>}
        {isOut(a.status) && !pending && lend && <button className="btn-next" disabled={blocked} onClick={() => { set('pic', ''); set('section', ''); setView('out1'); }}>Reassign</button>}
        {isOut(a.status) && !pending && requestOnly && !lend && <button className="btn-next" disabled={blocked} onClick={() => { set('pic', user.fullName); set('section', people.find((p) => p.name === user.fullName)?.section || ''); setView('out1'); }}>Request reassign</button>}
        {a.status === 'ON_LOAN' && can(user, 'remind') && <button className="btn-back" disabled={busy} onClick={() => run(() => api(`/assets/${a.id}/remind`, { method: 'POST' }))}>Send reminder</button>}
        {a.status === 'MAINTENANCE' && store && <button className="btn-finish" disabled={busy} onClick={() => run(() => api(`/assets/${a.id}/repaired`, { method: 'POST' }))}>Mark repaired</button>}
        {a.status === 'LOST' && store && <button className="btn-finish" disabled={busy} onClick={() => run(() => api(`/assets/${a.id}/found`, { method: 'POST' }))}>Mark found</button>}
        {(a.calRequired || a.calDue) && a.status !== 'DISPOSED' && store && <button className="btn-back" onClick={() => setView('cal')}>Record calibration</button>}
        {a.status === 'AVAILABLE' && store && <button className="btn-ghost btn-sm" disabled={busy} onClick={() => run(() => api(`/assets/${a.id}/maintenance`, { body: {} }))}>Send to maintenance</button>}
        {isOut(a.status) && (borrow || requestOnly) && <button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={() => confirm('Report this asset as lost?') && run(() => api(`/assets/${a.id}/lost`, { body: {} }))}>Report lost</button>}
      </div>
      {store && a.status !== 'DISPOSED' && (
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4">
          <div className="flex gap-2">
            {(a.status === 'AVAILABLE' || a.status === 'MAINTENANCE') && <button className="btn-danger btn-sm" disabled={busy}
              onClick={() => confirm(`Dispose ${a.id}? It will be written off but its history is kept.`) && run(() => api(`/assets/${a.id}/dispose`, { body: {} }))}>Dispose</button>}
            {user.role === 'ADMIN' && <button className="btn-ghost btn-sm text-red-600" disabled={busy}
              onClick={async () => {
                if (!confirm(`Permanently delete ${a.id}? Use this only for assets registered by mistake.`)) return;
                setBusy(true); setErr('');
                try { await api(`/assets/${a.id}`, { method: 'DELETE' }); onChanged?.(); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
              }}>Delete</button>}
          </div>
          <button className="btn-back btn-sm" onClick={() => setView('edit')}>Edit</button>
        </div>)}
      <h4 className="mt-5 text-[15px] font-semibold">History</h4>
      <ul className="mt-1 text-sm">
        {a.transactions.length ? a.transactions.map((t: any) => (
          <li key={t.id} className="flex gap-3 border-t border-slate-200 py-2">
            <span className="min-w-[96px] text-slate-500">{when(t.createdAt)}</span>
            <span>{ACTION[t.action] || t.action}{t.fromPic || t.toPic ? `: ${t.fromPic ? t.fromPic + ' → ' : ''}${t.toPic || ''}` : ''}{t.note && <span className="block text-slate-500">{t.note}</span>}</span>
          </li>)) : <li className="text-slate-500">No activity yet.</li>}
      </ul>
    </Modal>
  );
}
