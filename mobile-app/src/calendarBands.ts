import type { CalendarEvent } from './balanceProjection';

// Cath, 2026-11-06 (mockup A, "a ribbon with the name"): a trip runs across its days as one band
// and an event gets a small band on its day. This works out, week by week, which bands to draw.

export const MAX_BAND_LANES = 2;

export type WeekCell = { day: number; outside?: boolean } | null;

export type WeekBand = {
  key: string;
  kind: 'trip' | 'event';
  label: string;
  from: number; // first column in this week, 0 to 6
  to: number; // last column in this week
  roundStart: boolean; // the trip really starts here (not carried over from the week or month before)
  roundEnd: boolean;
  lane: number;
};

export type WeekLayout = {
  bands: WeekBand[];
  lanesAt: number[]; // per column: how many lanes to leave free under the day's number
  hiddenKeys: Set<string>; // no lane left: these stay as ordinary dots or names
};

export function layoutWeek(row: WeekCell[], events: Record<number, CalendarEvent[]>, maxLanes: number = MAX_BAND_LANES): WeekLayout {
  const found = new Map<string, WeekBand>();
  row.forEach((cell, col) => {
    if (!cell || cell.outside) return;
    for (const ev of events[cell.day] || []) {
      if (!ev.band) continue;
      const open = found.get(ev.band.key);
      if (open && open.to === col - 1) {
        open.to = col;
        open.roundEnd = ev.band.last;
      } else if (!open) {
        found.set(ev.band.key, { key: ev.band.key, kind: ev.band.kind, label: ev.label, from: col, to: col, roundStart: ev.band.first, roundEnd: ev.band.last, lane: 0 });
      }
    }
  });
  // Longest first, so a trip keeps its ribbon when the days get busy.
  const all = [...found.values()].sort((a, b) => b.to - b.from - (a.to - a.from) || a.from - b.from);
  const lanes: WeekBand[][] = [];
  const bands: WeekBand[] = [];
  const hiddenKeys = new Set<string>();
  for (const band of all) {
    let lane = lanes.findIndex((used) => used.every((b) => band.to < b.from || band.from > b.to));
    if (lane < 0 && lanes.length < maxLanes) {
      lanes.push([]);
      lane = lanes.length - 1;
    }
    if (lane < 0) {
      hiddenKeys.add(band.key);
      continue;
    }
    band.lane = lane;
    lanes[lane].push(band);
    bands.push(band);
  }
  const lanesAt = row.map((_, col) => bands.reduce((most, b) => (col >= b.from && col <= b.to ? Math.max(most, b.lane + 1) : most), 0));
  return { bands, lanesAt, hiddenKeys };
}

// What still shows as a dot or a name on a day: everything except what has a ribbon.
export function marksFor(events: CalendarEvent[], hiddenKeys: Set<string>): CalendarEvent[] {
  return events.filter((ev) => !ev.band || hiddenKeys.has(ev.band.key));
}
