import { useState } from 'react';
import Modal from './Modal';
import { api } from '../lib/api';
import { CATEGORIES, addMonths, day } from '../lib/format';

const LOCATIONS = ['Office', 'R&D Lab', 'Warehouse', 'Other'];

/** Register a new asset. The backend creates the AssetID (e.g. ENG-TLS-041) from the category. */
const ymd = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function AddAssetModal({ onClose, onCreated, asset }: { onClose: () => void; onCreated: (id: string) => void; asset?: any }) {
  const edit = !!asset;
  const [f, setF] = useState<any>(edit
    ? { name: asset.name || '', category: asset.category || 'Measuring', sku: asset.sku || '', brand: asset.brand || '', model: asset.model || '', serialNumber: asset.serialNumber || '', storageLocation: asset.storageLocation || 'Office', project: asset.project || '', purchaseDate: ymd(asset.purchaseDate), purchaseValue: asset.purchaseValue ?? '', warrantyEnd: ymd(asset.warrantyEnd), calRequired: !!asset.calRequired, calDue: ymd(asset.calDue), calIntervalMonths: asset.calIntervalMonths || 12, notes: asset.notes || '' }
    : { name: '', category: 'Measuring', sku: '', brand: '', model: '', serialNumber: '', storageLocation: 'Office', project: '', purchaseDate: '', purchaseValue: '', warrantyEnd: '', calRequired: false, calDue: '', calIntervalMonths: 12, notes: '', lastCal: '', calVendor: '', calCert: '', calFile: null });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const field = (k: string, label: string, ph = '', type = 'text') => (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} type={type} className="input" value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></div>);

  async function save() {
    if (!f.name.trim()) return setErr('Add the device name.');
    if (edit && f.calRequired && !f.calDue) return setErr('Add the calibration due date, or untick "Needs calibration".');
    if (!edit && f.calRequired) {
      if (!f.lastCal) return setErr('Add the last calibration date.');
      if (new Date(f.lastCal + 'T12:00') > new Date()) return setErr('The last calibration date cannot be in the future.');
      if (!f.calFile) return setErr('Upload the calibration certificate (PDF).');
      if (f.calFile.type !== 'application/pdf') return setErr('The certificate must be a PDF file.');
    }
    setBusy(true); setErr('');
    const body: any = { name: f.name.trim(), category: f.category, calRequired: f.calRequired, calIntervalMonths: +f.calIntervalMonths };
    for (const k of ['sku', 'brand', 'model', 'serialNumber', 'storageLocation', 'project', 'notes']) if (f[k]?.trim() || edit) body[k] = String(f[k] ?? '').trim();
    for (const k of ['purchaseDate', 'warrantyEnd']) if (f[k]) body[k] = new Date(f[k] + 'T12:00').toISOString(); else if (edit) body[k] = null;
    if (edit) body.calDue = f.calRequired && f.calDue ? new Date(f.calDue + 'T17:00').toISOString() : null;
    if (f.purchaseValue !== '' && f.purchaseValue !== null) body.purchaseValue = Number(f.purchaseValue);
    try {
      const a = edit ? await api(`/assets/${asset.id}`, { method: 'PATCH', body }) : await api('/assets', { body });
      if (!edit && f.calRequired) {
        // Store the certificate as the first calibration record; the backend sets the next due date
        const fd = new FormData();
        fd.append('calibratedAt', new Date(f.lastCal + 'T12:00').toISOString());
        fd.append('intervalMonths', String(f.calIntervalMonths));
        fd.append('result', 'ACCEPT');
        if (f.calVendor.trim()) fd.append('vendor', f.calVendor.trim());
        if (f.calCert.trim()) fd.append('certificateNo', f.calCert.trim());
        fd.append('file', f.calFile);
        try { await api(`/assets/${a.id}/calibrations`, { form: fd }); }
        catch (e) { setErr(`Asset ${a.id} was saved, but the certificate upload failed: ${e.message}. Open the asset and use Record calibration.`); return; }
      }
      onCreated(a.id);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal title={edit ? 'Edit asset' : 'Add asset'} subtitle={edit ? `${asset.id} — the AssetID stays the same` : 'The AssetID and QR code are created automatically'} onClose={onClose}>
      <div className="grid gap-3">
        {field('name', 'Device name *', 'e.g. Insulation Tester')}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="category">Category *</label>
            <select id="category" className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label" htmlFor="storageLocation">Storage location</label>
            <select id="storageLocation" className="input" value={f.storageLocation} onChange={(e) => set('storageLocation', e.target.value)}>{LOCATIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
          {field('brand', 'Brand', 'e.g. Hioki')}
          {field('model', 'Model', 'e.g. IR4057-50')}
          {field('serialNumber', 'Serial number')}
          {field('sku', 'SKU', 'optional')}
          {field('project', 'Project', 'e.g. PQA')}
          {field('purchaseDate', 'Purchase date', '', 'date')}
          {field('purchaseValue', 'Purchase value (Rp)', 'e.g. 12500000', 'number')}
          {field('warrantyEnd', 'Warranty end', '', 'date')}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand" checked={f.calRequired} onChange={(e) => set('calRequired', e.target.checked)} />Needs calibration</label>
        {f.calRequired && !edit && <div className="grid gap-3 sm:grid-cols-2">
          {field('lastCal', 'Last calibration date *', '', 'date')}
          <div><label className="label" htmlFor="ci2">Interval</label>
            <select id="ci2" className="input" value={f.calIntervalMonths} onChange={(e) => set('calIntervalMonths', e.target.value)}>{[6, 12, 24, 36].map((m) => <option key={m} value={m}>Every {m} months</option>)}</select></div>
          {field('calVendor', 'Vendor or lab', 'e.g. PT Kalibrasi Instrumen')}
          {field('calCert', 'Certificate number', 'e.g. CAL/2026/10/0182')}
          <div className="sm:col-span-2"><span className="label">Calibration certificate (PDF) *</span>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
              {f.calFile ? f.calFile.name : 'Click to upload the certificate PDF'}
              <input type="file" accept="application/pdf" hidden onChange={(e) => set('calFile', e.target.files?.[0] || null)} />
            </label></div>
          <div className="rounded-xl bg-deep-energy-x p-3 text-white sm:col-span-2"><div className="text-xs opacity-85">Next calibration due, set automatically</div>
            <div className="font-head text-xl font-bold text-white">{f.lastCal ? day(addMonths(new Date(f.lastCal + 'T12:00'), +f.calIntervalMonths)) : 'Pick the last calibration date'}</div></div>
        </div>}
        {f.calRequired && edit && <div className="grid gap-3 sm:grid-cols-2">
          {field('calDue', 'Calibration due *', '', 'date')}
          <div><label className="label" htmlFor="ci">Interval</label>
            <select id="ci" className="input" value={f.calIntervalMonths} onChange={(e) => set('calIntervalMonths', e.target.value)}>{[6, 12, 24, 36].map((m) => <option key={m} value={m}>Every {m} months</option>)}</select></div>
        </div>}
        <div><label className="label" htmlFor="notes">Notes</label><textarea id="notes" rows={2} className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="mt-5 flex justify-between"><button className="btn-back" onClick={onClose}>Cancel</button><button className="btn-finish" disabled={busy} onClick={save}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Save asset'}</button></div>
    </Modal>
  );
}
