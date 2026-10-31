// Sunrise and sunset worked out on the phone (moved out of sky.ts on 2026-10-31, unchanged, so
// Day & night (dayNight.ts) and the checks can use it without the phone-only parts of sky.ts).

// ---- Sunrise and sunset (the standard NOAA sunrise equation) ----
const RAD = Math.PI / 180;
const norm = (v: number, max: number) => ((v % max) + max) % max;

function sunEvent(date: Date, lat: number, lon: number, rising: boolean): Date | null {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - start.getTime()) / 86400000);
  const lngHour = lon / 15;
  const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = norm(M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634, 360);
  let RA = norm(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD, 360);
  RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
  const sinDec = 0.39782 * Math.sin(L * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
  if (cosH > 1 || cosH < -1) return null; // the sun doesn't rise or set that day
  const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const UT = norm(T - lngHour, 24);
  let when = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + UT * 3600000);
  // Keep it on the same local day (east of Greenwich, sunrise can fall on the previous UTC day).
  const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime();
  if (when.getTime() - localNoon > 12 * 3600000) when = new Date(when.getTime() - 86400000);
  if (when.getTime() - localNoon < -12 * 3600000) when = new Date(when.getTime() + 86400000);
  return when;
}

export function sunTimes(date: Date, lat?: number, lon?: number): { sunrise: Date; sunset: Date; noon: Date } {
  const at = (h: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
  let sunrise = at(6);
  let sunset = at(18);
  if (typeof lat === 'number' && typeof lon === 'number') {
    const r = sunEvent(date, lat, lon, true);
    const s = sunEvent(date, lat, lon, false);
    if (r && s && s > r) {
      sunrise = r;
      sunset = s;
    }
  }
  return { sunrise, sunset, noon: new Date((sunrise.getTime() + sunset.getTime()) / 2) };
}

