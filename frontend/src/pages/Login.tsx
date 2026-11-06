import { useState } from 'react';
import { useAuth } from '../lib/auth';

/**
 * Split login page (same layout as VIRA):
 * left  = site photo with a frosted card: MIRA + "Engineering Tool Monitor"
 * right = sign-in form with the ATW logo, engineering team or general loan (guest)
 */
export default function Login() {
  const { login, loginGuest } = useAuth();
  const [mode, setMode] = useState<'staff' | 'guest'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const switchTo = (m: 'staff' | 'guest') => { setMode(m); setErr(''); };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { mode === 'staff' ? await login(email, password) : await loginGuest(name, email); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: photo + MIRA card (desktop only). Card sits in the top-left corner */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/login-bg.jpg" alt="ATW Solar engineers checking a rooftop PV installation" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '35% center' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/10 via-transparent to-ink/50" />
        <div className="absolute left-10 right-10 top-10 max-w-[430px] rounded-[1.4rem] border border-white/50 bg-white/60 p-5 shadow-2xl backdrop-blur-md xl:left-14 xl:top-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand/80">ATW Solar Indonesia</div>
          <div className="font-head text-4xl font-extrabold leading-tight text-brand">MIRA</div>
          <div className="text-lg font-medium text-ink">Engineering Tool Monitor</div>
          <div className="my-3 h-px bg-ink/25" />
          <p className="text-[13px] leading-relaxed text-ink/80">Scan, borrow and return tools, track who holds what, and keep every instrument calibrated.</p>
        </div>
      </div>

      {/* Right: sign-in form */}
      <div className="relative grid place-items-center overflow-hidden bg-ice px-4 py-10"
        style={{ backgroundImage: 'radial-gradient(ellipse 70% 60% at 0% 100%, rgba(255,193,37,.5), rgba(255,193,37,0) 70%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(79,160,208,.14), rgba(79,160,208,0) 70%)' }}>
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/75 p-7 shadow-2xl backdrop-blur sm:p-9">
          <img src="/logo.png" alt="ATW Solar" className="mx-auto mb-2 h-[88px] w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div className="mb-5 text-center lg:hidden"><span className="block font-head text-2xl font-extrabold text-brand">MIRA</span><span className="block text-sm text-slate-500">Engineering Tool Monitor</span></div>
          <h1 className="mb-1 mt-4 text-center text-lg font-bold">{mode === 'staff' ? 'Sign in' : 'General loan'}</h1>
          <p className="mb-5 text-center text-sm text-slate-500">{mode === 'staff' ? 'Engineering team: use your work account.' : 'For borrowers outside the engineering team. We use your email to remind you to return the tool.'}</p>

          <div className="space-y-4">
            {mode === 'guest' && <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" aria-label="Full name" autoComplete="name" required minLength={2} />}
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email (name@atw.com)" aria-label="Email" autoComplete={mode === 'staff' ? 'username' : 'email'} required />
            {mode === 'staff' && (
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-12" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" aria-label="Password" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-brand" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {showPw ? <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
                      : <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>}
                  </svg>
                </button>
              </div>)}
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <button className="btn-finish mt-6 w-full !min-h-[48px] text-base" disabled={busy}>{busy ? 'Please wait…' : mode === 'staff' ? 'Sign In' : 'Continue with general loan'}</button>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-center text-sm text-amber-900">
            {mode === 'staff'
              ? <><b>Not in the engineering team?</b> Use <button type="button" className="font-semibold text-brand underline" onClick={() => switchTo('guest')}>General loan</button>. No account needed.</>
              : <><b>Engineering team?</b> <button type="button" className="font-semibold text-brand underline" onClick={() => switchTo('staff')}>Sign in with your account</button> instead.</>}
          </div>
        </form>
      </div>
    </div>
  );
}
