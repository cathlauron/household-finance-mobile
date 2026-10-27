// The small "this month vs last month" spending lines on Home's Left to Spend card
// (HomeHero). Points are "x,y" strings for an SVG polyline. Day 1 is at the left edge and
// the last day of THIS month at the right edge.
//
// H-08 (2026-10-22): last month can have more days than this one (Oct 31 -> Nov 30); its
// extra days used to be drawn past the right edge. Only the days this month has are drawn.
export function chartPoints(values: number[], daysThis: number, width: number, height: number, maxY: number): string[] {
  return values.slice(0, Math.max(1, daysThis)).map(
    (v, i) => `${((i / Math.max(1, daysThis - 1)) * width).toFixed(1)},${(height - 2 - (v / Math.max(1, maxY)) * (height - 6)).toFixed(1)}`
  );
}
