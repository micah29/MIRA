import { STATUS } from '../lib/format';
export const Pill = ({ color, children }: { color: string; children: any }) => (
  <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color, background: `${color}22` }}>{children}</span>
);
export const StatusPill = ({ status }: { status: string }) => <Pill color={STATUS[status]?.color || '#64748B'}>{STATUS[status]?.label || status}</Pill>;
