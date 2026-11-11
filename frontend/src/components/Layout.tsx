import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { can, useAuth } from '../lib/auth';

const NAV = [
  ['/', 'Dashboard', 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'],
  ['/assets', 'Assets', 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'],
  ['/scan', 'Scan QR', 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10'],
  ['/calibration', 'Calibration', 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M9 15l2 2 4-4'],
  ['/activity', 'Activity', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2'],
];
/** Only Admin may print/manage QR labels. */
const LABELS_NAV = ['/labels', 'QR labels', 'M3 12V3h9l9 9-9 9z'];
/** Storekeeper + Admin approve borrow requests. */
const APPROVALS_NAV = ['/approvals', 'Approvals', 'M9 12l2 2 4-4M7.8 4.2A9 9 0 1 1 4.2 7.8'];
const ADMIN_NAV = [['/users', 'Users', 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8']];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const items = [
    ...NAV,
    ...(can(user, 'approve') ? [APPROVALS_NAV] : []),
    ...(can(user, 'labelsAdmin') ? [LABELS_NAV] : []),
    ...(user.role === 'ADMIN' ? ADMIN_NAV : []),
  ];
  const title = items.find(([p]) => p === loc.pathname)?.[1] || 'MIRA';
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-deep-energy text-white flex flex-col p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2 pb-6 pt-2">
          <div className="flex flex-col gap-3">
            {/* White-lettering ATW logo for the blue sidebar. Height chosen so the ATW letters match the MIRA wordmark */}
            <img src="/logo-white.png" alt="ATW Solar" className="h-[65px] w-auto self-start" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <div><div className="font-head text-2xl font-extrabold tracking-wide text-white">MIRA</div><div className="text-xs opacity-85">Engineering tool monitor</div></div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map(([to, label, d]) => (
            <NavLink key={to} to={to} end onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium ${isActive ? 'bg-sun text-ink shadow-soft' : 'hover:bg-white/10'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/10 p-3 text-sm">
          <div className="font-semibold">{user.fullName}</div>
          <div className="opacity-85 capitalize">{user.role.toLowerCase()}</div>
          <button className="mt-2 text-xs underline opacity-90" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-brand px-4 py-3 text-white lg:bg-ice/90 lg:text-ink lg:border-b lg:border-slate-200 lg:px-7 backdrop-blur">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <h1 className="text-lg font-bold text-inherit lg:text-xl">{title}</h1>
          <span className="ml-auto text-xs opacity-80">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-7"><Outlet /></main>
      </div>
    </div>
  );
}
