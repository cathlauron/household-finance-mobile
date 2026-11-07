import { act, renderHook } from '@testing-library/react-native';

// Cath, 2026-11-06: Live weather showed rain without asking. Turning it on may only ever use a fresh
// reading from the phone's location, and with location not allowed it goes back to Off.
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: async (keys: string[]) => keys.map((k) => [k, mockStore[k] ?? null]),
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    multiRemove: async (keys: string[]) => { keys.forEach((k) => delete mockStore[k]); },
  },
}));
const mockRequest = jest.fn();
const mockGet = jest.fn();
const mockLast = jest.fn();
const mockCurrent = jest.fn();
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...a: any[]) => mockRequest(...a),
  getForegroundPermissionsAsync: (...a: any[]) => mockGet(...a),
  getLastKnownPositionAsync: (...a: any[]) => mockLast(...a),
  getCurrentPositionAsync: (...a: any[]) => mockCurrent(...a),
  Accuracy: { Low: 2 },
}));

// Each check loads sky.ts fresh (it reads saved values once), with the same React as the renderer.
const mockReact = require('react');
const mockRN = require('react-native');
const POS = { coords: { latitude: 14.5512, longitude: 121.0234 } };
const settle = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
let fetchMock: jest.Mock;

function saved({ on, rain, place }: { on: boolean; rain?: boolean; place?: boolean }) {
  mockStore.skyPrefs = JSON.stringify({ glowOn: true, liveWeatherOn: on, rainAnimOn: true });
  if (rain) mockStore.skyWeather = JSON.stringify({ kind: 'rain', at: Date.now() - 60000 });
  if (place) mockStore.skyPlace = JSON.stringify({ lat: 1.11, lon: 2.22, at: Date.now() - 60000 });
}
async function load() {
  const sky = require('../src/sky');
  await settle();
  return sky;
}

beforeEach(() => {
  jest.resetModules();
  jest.doMock('react', () => mockReact);
  jest.doMock('react-native', () => mockRN);
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  [mockRequest, mockGet, mockLast, mockCurrent].forEach((m) => m.mockReset());
  mockRequest.mockResolvedValue({ status: 'granted' });
  mockGet.mockResolvedValue({ status: 'granted' });
  mockLast.mockResolvedValue(POS);
  fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ current: { weather_code: 0 } }) }));
  (global as any).fetch = fetchMock;
});

test('turning it on asks for location, and saying no leaves it off with no weather fetched', async () => {
  mockRequest.mockResolvedValue({ status: 'denied' });
  const sky = await load();
  let ok: boolean | undefined;
  await act(async () => { ok = await sky.setLiveWeatherOn(true); });
  await settle();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(ok).toBe(false);
  expect(renderHook(() => sky.useSkyPrefs()).result.current.liveWeatherOn).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('an old rain reading is not shown when it is turned on (the check failed)', async () => {
  saved({ on: false, rain: true });
  fetchMock.mockRejectedValue(new Error('offline'));
  const sky = await load();
  const { result } = renderHook(() => sky.useSkyWeather());
  await act(async () => { await sky.setLiveWeatherOn(true); });
  await settle();
  expect(result.current).toBe('clear');
});

test('a place from an earlier time is not used when it is turned on', async () => {
  saved({ on: false, place: true });
  mockLast.mockResolvedValue(null);
  mockCurrent.mockRejectedValue(new Error('location is off'));
  const sky = await load();
  renderHook(() => sky.useSkyPhase());
  await act(async () => { await sky.setLiveWeatherOn(true); });
  await settle();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(sky.skyPlaceNow()).toBeNull();
});

test('a real reading still shows after it is turned on', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ current: { weather_code: 63, precipitation: 1.2, cloud_cover: 90 } }) });
  const sky = await load();
  const { result } = renderHook(() => sky.useSkyWeather());
  await act(async () => { await sky.setLiveWeatherOn(true); });
  await settle();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toContain('latitude=14.55');
  expect(result.current).toBe('rain');
});

test('with location no longer allowed it goes back to Off and shows no weather', async () => {
  saved({ on: true, rain: true, place: true });
  mockGet.mockResolvedValue({ status: 'denied' });
  const sky = await load();
  const prefs = renderHook(() => sky.useSkyPrefs());
  const weather = renderHook(() => sky.useSkyWeather());
  renderHook(() => sky.useSkyPhase());
  await settle();
  expect(prefs.result.current.liveWeatherOn).toBe(false);
  expect(weather.result.current).toBe('clear');
  expect(sky.skyPlaceNow()).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

// Cath, 2026-11-06, H-74: "real rain only". Open-Meteo's drizzle codes come with tiny amounts on dry days.
test('rain shows only when real rain is reported, at least 0.5 mm', async () => {
  const sky = await load();
  const see = (code: number, precipitation: number, cloud_cover: number) => sky.weatherFromReading({ code, precipitation, cloudCover: cloud_cover });
  expect(see(51, 0.1, 27)).toBe('clear'); // Manila's dry-day reading
  expect(see(53, 0.2, 66)).toBe('cloudy');
  expect(see(51, 0.1, 50)).toBe('cloudy');
  expect(see(61, 0.4, 90)).toBe('cloudy');
  expect(see(61, 0.5, 90)).toBe('rain');
  expect(see(95, 3, 100)).toBe('rain');
  expect(see(80, 1, 40)).toBe('rain');
});

test('the other kinds of weather stay as they were', async () => {
  const sky = await load();
  const see = (code: number) => sky.weatherFromReading({ code, precipitation: 0, cloudCover: 100 });
  expect([0, 1, 2].map(see)).toEqual(['clear', 'clear', 'clear']);
  expect([3, 45, 48, 71].map(see)).toEqual(['cloudy', 'cloudy', 'cloudy', 'cloudy']);
});

test('a reading with no amount is not called rain', async () => {
  const sky = await load();
  expect(sky.weatherFromReading({ code: 61 })).toBe('cloudy');
});

test('the rainfall and cloud amounts are asked for, and a dry drizzle reading shows no rain', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ current: { weather_code: 51, precipitation: 0.1, cloud_cover: 27 } }) });
  const sky = await load();
  const { result } = renderHook(() => sky.useSkyWeather());
  await act(async () => { await sky.setLiveWeatherOn(true); });
  await settle();
  expect(fetchMock.mock.calls[0][0]).toContain('current=weather_code,precipitation,cloud_cover');
  expect(result.current).toBe('clear');
});
