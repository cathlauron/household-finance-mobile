// Cath, 2026-11-06 (speed): saving one transaction used to redraw every row on Transactions. A
// day's rows are now kept and reused until something they show changes. This string is what they
// show: anything drawn in a row must be in here, or the row would stay old.
type Row = { id: string; [key: string]: unknown };
export type DayContext = {
  manual: (rawId: string) => { addedBy?: string; paymentMethod?: unknown; refundExpectedAmount?: unknown; refundTransactionId?: unknown } | undefined;
  account: (paymentMethod: unknown) => string;
  arrived: string | null;
  heading: string;
};

const SHOWN = ['id', 'rawId', 'label', 'amount', 'date', 'direction', 'category', 'source', 'transfer'];

export function daySignature(day: { date: string; items: Row[] }, ctx: DayContext): string {
  const rows = day.items.map((t) => {
    const raw = typeof t.rawId === 'string' ? ctx.manual(t.rawId) : undefined;
    return [
      SHOWN.map((k) => t[k]),
      raw ? [raw.addedBy, ctx.account(raw.paymentMethod), raw.refundExpectedAmount, raw.refundTransactionId] : null,
      ctx.arrived === t.id,
    ];
  });
  return JSON.stringify([day.date, ctx.heading, rows]);
}
