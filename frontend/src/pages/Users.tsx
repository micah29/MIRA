import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Modal from '../components/Modal';
import { Pill } from '../components/StatusPill';

const ROLES = [
  ['ENGINEER', 'Engineer', 'View assets, check out, reassign, reserve, report lost'],
  ['STOREKEEPER', 'Storekeeper', 'Everything for assets: check in, calibration, maintenance, add/edit assets'],
  ['MANAGEMENT', 'Management', 'Read-only: dashboard and lists'],
  ['ADMIN', 'Admin', 'Everything, including user accounts and deleting assets'],
];
const roleLabel = (r: string) => ROLES.find(([k]) => k === r)?.[1] || r;

/** VIRA "User Management": list, create, edit (role, active, reset password). Admin only. */
export default function Users() {
  const { user: me } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null); // {} = new user
  const [f, setF] = useState<any>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api('/users').then(setList);
  useEffect(() => { load(); }, []);
  if (me.role !== 'ADMIN') return <p className="text-slate-500">Only admins can manage user accounts.</p>;

  const openForm = (u: any) => { setEdit(u); setErr(''); setF(u.id ? { fullName: u.fullName, email: u.email, role: u.role, active: u.active, password: '' } : { fullName: '', email: '', role: 'ENGINEER', active: true, password: '' }); };
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.fullName.trim()) return setErr('Add the full name.');
    if (!edit.id && !/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Add a valid email.');
    if ((!edit.id || f.password) && f.password.length < 8) return setErr('Password must be at least 8 characters.');
    if (edit.id === me.id && (f.role !== 'ADMIN' || !f.active)) return setErr("You can't remove your own admin access.");
    setBusy(true); setErr('');
    try {
      if (edit.id) await api(`/users/${edit.id}`, { method: 'PATCH', body: { fullName: f.fullName.trim(), role: f.role, active: f.active, ...(f.password ? { password: f.password } : {}) } });
      else await api('/users', { body: { fullName: f.fullName.trim(), email: f.email.trim(), role: f.role, password: f.password } });
      setEdit(null); load();
    } catch (e) { setErr(e.message.includes('Unique') ? 'That email already has an account.' : e.message); } finally { setBusy(false); }
  }

  return (<>
    <div className="mb-3 flex items-center gap-2"><p className="flex-1 text-sm text-slate-500">Create an account for each person who signs in to MIRA. Share the email and password with them; they sign in at the login page.</p>
      <button className="btn-finish" onClick={() => openForm({})}>+ Add user</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((u) => (
      <button key={u.id} className="item" onClick={() => openForm(u)}>
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-sky-100 font-head font-bold text-brand">{u.fullName.charAt(0)}</span>
        <span className="flex-1 min-w-0"><span className="block font-semibold text-brand">{u.fullName}</span><span className="block truncate text-xs text-slate-500">{u.email}</span></span>
        <span className="flex flex-col items-end gap-1"><Pill color="#2A6484">{roleLabel(u.role)}</Pill>{!u.active && <Pill color="#DC2626">Inactive</Pill>}</span>
      </button>))}</div>
    {edit && <Modal title={edit.id ? 'Edit user' : 'Add user'} subtitle={edit.id ? edit.email : 'New MIRA account'} onClose={() => setEdit(null)}>
      <div className="grid gap-3">
        <div><label className="label" htmlFor="fn">Full name *</label><input id="fn" className="input" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="e.g. Rizky Budiman" /></div>
        <div><label className="label" htmlFor="em">Email *</label><input id="em" type="email" className="input" value={f.email} disabled={!!edit.id} onChange={(e) => set('email', e.target.value)} placeholder="e.g. rizky@atw.com" />{edit.id && <p className="mt-1 text-xs text-slate-500">The email is the login name and can't be changed.</p>}</div>
        <div><label className="label" htmlFor="rl">Role *</label><select id="rl" className="input" value={f.role} onChange={(e) => set('role', e.target.value)}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <p className="mt-1 text-xs text-slate-500">{ROLES.find(([k]) => k === f.role)?.[2]}</p></div>
        <div><label className="label" htmlFor="pw">{edit.id ? 'New password (leave empty to keep the current one)' : 'Password *'}</label><input id="pw" type="text" className="input" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></div>
        {edit.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={f.active} onChange={(e) => set('active', e.target.checked)} />Active (untick to block sign-in without deleting the account)</label>}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="mt-5 flex justify-between"><button className="btn-back" onClick={() => setEdit(null)}>Cancel</button><button className="btn-next" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
    </Modal>}
  </>);
}
