export const STATUS: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: '#16A34A' },
  IN_USE: { label: 'In Use', color: '#2A6484' },
  ON_LOAN: { label: 'On Loan', color: '#4FA0D0' },
  PROJECT: { label: 'Project', color: '#C48A00' },
  MAINTENANCE: { label: 'Maintenance', color: '#E08600' },
  RESERVED: { label: 'Reserved', color: '#0E8584' },
  LOST: { label: 'Lost', color: '#64748B' },
  DISPOSED: { label: 'Disposed', color: '#475569' },
};
export const ACTION: Record<string, string> = {
  REGISTERED: 'Registered', CHECK_OUT: 'Check out', TRANSFER: 'Transfer', CHECK_IN: 'Check in', RESERVE: 'Reserve',
  CANCEL_RESERVATION: 'Cancel reservation', REMINDER: 'Reminder sent', LOST: 'Lost', FOUND: 'Found', MAINTENANCE: 'Maintenance',
  REPAIRED: 'Repaired', DISPOSED: 'Disposed', CALIBRATION: 'Calibration recorded', CALIBRATION_REJECTED: 'Calibration rejected',
};
export const CATEGORIES = ['Measuring', 'Testing', 'RnD', 'Electrical', 'Mechanical', 'IT/Communication', 'Safety', 'Other'];
export const day = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const when = (d?: string | Date | null) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const rel = (ms: number) => { const a = Math.abs(ms), m = Math.round(a / 6e4); if (m < 60) return `${m} min`; const h = Math.round(a / 36e5); return h < 48 ? `${h} h` : `${Math.round(a / 864e5)} d`; };
export const isOut = (s: string) => ['IN_USE', 'ON_LOAN', 'PROJECT'].includes(s);
export const isLate = (a: any) => a.status === 'ON_LOAN' && a.dueBack && new Date(a.dueBack).getTime() < Date.now();
export function calState(a: any): 'expired' | 'soon' | 'valid' | 'nodate' | null {
  if (a.status === 'DISPOSED') return null;
  if (!a.calDue) return a.calRequired ? 'nodate' : null;
  const d = (new Date(a.calDue).getTime() - Date.now()) / 864e5;
  return d < 0 ? 'expired' : d <= 30 ? 'soon' : 'valid';
}
/** Same rule as the backend: calibration date + interval, clamped to month end. */
export function addMonths(date: Date, m: number) {
  const d = new Date(date); const dd = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + m);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(dd, last)); return d;
}
