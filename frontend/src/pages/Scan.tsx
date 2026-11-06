import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import AssetModal from '../components/AssetModal';

export default function Scan() {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState('');
  const [id, setId] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<Html5Qrcode | null>(null);
  const stop = async () => { try { await ref.current?.stop(); } catch {} setOn(false); };
  useEffect(() => () => { stop(); }, []);
  const start = async () => {
    setMsg('');
    try {
      ref.current = ref.current || new Html5Qrcode('reader');
      await ref.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, async (text) => { await stop(); navigator.vibrate?.(80); setOpen(text.trim()); }, () => {});
      setOn(true);
    } catch { setMsg('Camera access was blocked or is unavailable. Allow camera access (HTTPS is required on phones), or type the AssetID.'); }
  };
  return (<div className="grid gap-4 lg:grid-cols-2">
    <div className="card">
      <div id="reader" className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-800" />
      <div className="mt-3 flex gap-2">{on ? <button className="btn-ghost" onClick={stop}>Stop camera</button> : <button className="btn-next" onClick={start}>Start camera</button>}</div>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
    </div>
    <div className="card"><h3 className="mb-3 text-base font-bold">Type an AssetID</h3>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (id.trim()) setOpen(id.trim().toUpperCase()); }}>
        <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. ENG-TLS-001" aria-label="AssetID" /><button className="btn-finish">Open</button></form></div>
    {open && <AssetModal id={open} onClose={() => setOpen(null)} />}
  </div>);
}
