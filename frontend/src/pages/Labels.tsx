import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Labels() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => { api('/assets').then(setList); }, []);
  const flip = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const print = () => { document.body.classList.add('print-labels'); window.print(); setTimeout(() => document.body.classList.remove('print-labels'), 500); };
  if (user.role !== 'ADMIN') return <p className="text-slate-500">Only admins can print or manage QR labels.</p>;
  return (<>
    <div className="mb-3 flex flex-wrap items-center gap-2"><span className="flex-1 text-sm text-slate-500">Each QR code holds the AssetID. Select labels, then print on weatherproof sticker paper.</span>
      <button className="btn-ghost" onClick={() => setSel(new Set(list.map((a) => a.id)))}>Select all</button><button className="btn-ghost" onClick={() => setSel(new Set())}>Clear</button>
      <button className="btn-export" disabled={!sel.size} onClick={print}>Print selected ({sel.size})</button></div>
    <div id="labelSheet" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{list.map((a) => (
      <label key={a.id} className={`relative grid cursor-pointer grid-cols-[86px_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 ${sel.has(a.id) ? 'lbl-on' : 'lbl-off opacity-50'}`}>
        <input type="checkbox" className="lbl-check absolute right-2 top-2 accent-brand" checked={sel.has(a.id)} onChange={() => flip(a.id)} />
        <QRCodeSVG value={a.id} size={86} />
        <span><span className="block font-head font-bold text-brand">{a.id}</span><span className="block text-xs">{a.name}</span><span className="block text-[10px] text-slate-500">MIRA asset{a.serialNumber ? `, SN ${a.serialNumber}` : ''}</span></span>
      </label>))}</div>
  </>);
}
