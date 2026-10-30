// Peel-off switches (mockup K2e, approved by Cath 2026-10-29). The shapes of a sticker
// being peeled from its top-right corner, and of the whole screen peeling from ITS top-right
// corner (Dark mode). Plain maths, no drawing: every function is a worklet so it runs on
// the phone's animation thread while a finger moves (tests/peelGeometry.test.mjs).

export type Pt = [number, number];

// Keep the part of a polygon on the side where (x·n - d) >= 0.
export function clipPoly(poly: Pt[], n: Pt, d: number): Pt[] {
  'worklet';
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = a[0] * n[0] + a[1] * n[1] - d;
    const db = b[0] * n[0] + b[1] * n[1] - d;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

// Mirror points over the line x·n = d (n has length 1): the fold.
export function reflect(poly: Pt[], n: Pt, d: number): Pt[] {
  'worklet';
  return poly.map((x) => {
    const s = 2 * (x[0] * n[0] + x[1] * n[1] - d);
    return [x[0] - s * n[0], x[1] - s * n[1]] as Pt;
  });
}

// An SVG path for a polygon ('' when empty, which draws nothing).
export function pathOf(poly: Pt[], dx = 0, dy = 0): string {
  'worklet';
  if (poly.length < 3) return '';
  let s = '';
  for (let i = 0; i < poly.length; i++) s += (i ? 'L' : 'M') + (poly[i][0] + dx).toFixed(2) + ' ' + (poly[i][1] + dy).toFixed(2);
  return s + 'Z';
}

// Where a sticker of size w×h starts (its top-right corner), and where a full peel ends.
export function stickerCorner(w: number): Pt {
  'worklet';
  return [w, 0];
}
export function stickerFar(w: number, h: number): Pt {
  'worklet';
  return [w - 2.3 * w, 2.3 * h];
}

// A sticker peeled so its top-right corner sits at point p.
//   keep:  the part still stuck down (the current face shows there)
//   flap:  the lifted part, folded over (its back shows there)
//   k:     how far it has come off, 0 to 1 (1 = fully off)
//   past:  true once it's more than halfway (letting go there finishes the peel)
export function stickerPeel(w: number, h: number, p: Pt) {
  'worklet';
  const rect: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const c = stickerCorner(w);
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const diag = Math.sqrt(w * w + h * h);
  if (len < 0.5) return { keep: rect, flap: [] as Pt[], k: 0, past: false };
  const n: Pt = [dx / len, dy / len];
  const m: Pt = [(p[0] + c[0]) / 2, (p[1] + c[1]) / 2];
  const d = m[0] * n[0] + m[1] * n[1];
  const keep = clipPoly(rect, n, d);
  const lifted = clipPoly(rect, [-n[0], -n[1]], -d);
  const flap = reflect(lifted, n, d);
  return { keep, flap, k: Math.min(1, len / (2 * diag)), past: len / diag > 0.5 };
}

// The whole screen (w×h) peeling from its top-right corner at 45 degrees, k from 0 to 1.
//   fold:     how far the fold line has moved in from the corner (along the diagonal)
//   revealed: the corner part that now shows the other look
//   flap:     the lifted corner of the screen, folded over and kept inside the screen
export function screenPeel(w: number, h: number, k: number) {
  'worklet';
  const kk = Math.max(0, Math.min(1, k));
  const r = Math.SQRT1_2;
  const n: Pt = [-r, r];
  const reach = (w + h) * r;
  const fold = reach * Math.min(1, kk * 1.02);
  const d = -w * r + fold;
  const rect: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
  if (kk <= 0) return { fold: 0, revealed: [] as Pt[], flap: [] as Pt[] };
  const revealed = clipPoly(rect, [-n[0], -n[1]], -d);
  let flap = clipPoly(reflect(revealed, n, d), n, d - 0.5);
  flap = clipPoly(flap, [1, 0], 0);
  flap = clipPoly(flap, [-1, 0], -w);
  flap = clipPoly(flap, [0, 1], 0);
  flap = clipPoly(flap, [0, -1], -h);
  return { fold, revealed, flap };
}
