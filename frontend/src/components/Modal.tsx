import { useEffect } from 'react';

/** VIRA popup card: title + subtitle, close (X), scrollable body. */
export default function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: any }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-3" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-clean-glass shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div><h3 className="font-sans text-xl font-semibold">{title}</h3>{subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}</div>
          <button className="ml-auto p-1" aria-label="Close" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
