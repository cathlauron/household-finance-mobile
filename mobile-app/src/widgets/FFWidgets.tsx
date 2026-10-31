'use no memo';
import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from './widgetData';

// Home screen widgets (mockup W2, approved by Cath 2026-10-30), drawn with the widget
// library's own pieces (not app screens). Colours are the app's: the crimson Left-to-spend
// card, soft paper cards, pink buttons. Tapping 🎙 Say it opens the app on voice entry,
// + Add on a new transaction, anywhere else opens the app.

export const WIDGET_NAMES = ['LeftToSpend', 'SayIt', 'SpendSay', 'DueSoon', 'Month', 'Trip'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

const C = {
  ink: '#2A1A20',
  muted: '#7A6670',
  pink: '#F28AA6',
  pinkInk: '#3B0F1E',
  tint: '#FBE3EA',
  rose: '#C2185B',
  red: '#B3262E',
  white: '#FFFFFF',
} as const;
const CRIMSON = { from: '#E2556F', to: '#7E0F27', orientation: 'TR_BL' } as const;
const PAPER = { from: '#FFFFFF', to: '#FFF4F6', orientation: 'TOP_BOTTOM' } as const;
const BLUE = { from: '#5C8DE8', to: '#1D3C86', orientation: 'TR_BL' } as const;

export const VOICE_URI = 'financeflow://voice';
export const ADD_URI = 'financeflow://add';

const T = (text: string, size: number, color: string, weight: any = '700', extra: object = {}) => (
  <TextWidget text={text} style={{ fontSize: size, color: color as any, fontWeight: weight, ...extra }} />
);

function ring(pct: number, size = 60): string {
  const r = 24;
  const len = 2 * Math.PI * r;
  const off = len * (1 - pct / 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="7" fill="none"/><circle cx="30" cy="30" r="${r}" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 30 30)"/></svg>`;
}

export function sparkSvg(values: number[], color: string, w = 120, h = 38): string {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / Math.max(1, values.length - 1)) * (w - 6) + 3).toFixed(1)},${(h - 4 - (v / max) * (h - 10)).toFixed(1)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function bar(pct: number, color: string, w = 150): string {
  const fill = Math.max(4, (pct / 100) * w);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="8" viewBox="0 0 ${w} 8"><rect width="${w}" height="8" rx="4" fill="#F1E4E8"/><rect width="${fill.toFixed(1)}" height="8" rx="4" fill="${color}"/></svg>`;
}

function Buttons({ onCrimson }: { onCrimson: boolean }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 10, flexGap: 8 }}>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: VOICE_URI }}
        style={{ flex: 1, height: 36, borderRadius: 14, backgroundColor: onCrimson ? C.white : C.pink, justifyContent: 'center', alignItems: 'center' }}
      >
        {T('🎙 Say it', 13, onCrimson ? C.rose : C.pinkInk, '900')}
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: ADD_URI }}
        style={{ flex: 1, height: 36, borderRadius: 14, backgroundColor: onCrimson ? 'rgba(255, 255, 255, 0.22)' : C.tint, justifyContent: 'center', alignItems: 'center' }}
      >
        {T('+ Add', 13, onCrimson ? C.white : C.rose, '900')}
      </FlexWidget>
    </FlexWidget>
  );
}

const payday = (s: WidgetSnapshot) => (s.daysToPayday === null ? 'until month end' : `${s.daysToPayday} ${s.daysToPayday === 1 ? 'day' : 'days'} to payday`);

export function LeftToSpendWidget({ s }: { s: WidgetSnapshot }) {
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: CRIMSON, justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        {T('LEFT TO SPEND', 11, C.white, '800', { letterSpacing: 0.3 })}
        {T(s.lts, 20, C.white, '900')}
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <SvgWidget svg={ring(s.periodPct, 52)} style={{ width: 52, height: 52 }} />
        {T(payday(s), 11, C.white, '700', { textAlign: 'right' })}
      </FlexWidget>
    </FlexWidget>
  );
}

export function SayItWidget() {
  const mic = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="36" fill="${C.pink}" fill-opacity="0.3"/><circle cx="36" cy="36" r="28" fill="${C.pink}"/><g transform="translate(24 22)" fill="none" stroke="${C.pinkInk}" stroke-width="2.4" stroke-linecap="round"><rect x="8" y="1" width="8" height="15" rx="4"/><path d="M3 12a9 9 0 0 0 18 0M12 21v4"/></g></svg>`;
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: VOICE_URI }} style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 12, backgroundGradient: PAPER, justifyContent: 'center', alignItems: 'center' }}>
      <SvgWidget svg={mic} style={{ width: 72, height: 72 }} />
      {T('Say it', 13, C.rose, '900', { marginTop: 6 })}
      {T('"Spent 250 on…"', 11, C.muted, '700')}
    </FlexWidget>
  );
}

export function SpendSayWidget({ s }: { s: WidgetSnapshot }) {
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: CRIMSON, justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          {T('LEFT TO SPEND', 11, C.white, '800')}
          {T(s.lts, 24, C.white, '900')}
          {T(`${s.perDay} a day · ${payday(s)}`, 11, C.white, '700')}
        </FlexWidget>
        <SvgWidget svg={sparkSvg(s.week, '#FFFFFF', 110, 46)} style={{ width: 110, height: 46 }} />
      </FlexWidget>
      <Buttons onCrimson />
    </FlexWidget>
  );
}

function DueRows({ s, max }: { s: WidgetSnapshot; max: number }) {
  if (!s.due.length) return T('Nothing due in the next month', 12, C.muted, '700', { marginTop: 6 });
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
      {s.due.slice(0, max).map((d, i) => (
        <FlexWidget key={i} style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget text={d.name} truncate="END" maxLines={1} style={{ fontSize: 12.5, color: C.ink, fontWeight: '700' }} />
            <FlexWidget style={{ marginLeft: 6, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: C.tint }}>
              {T(d.day, 10, C.rose, '800')}
            </FlexWidget>
          </FlexWidget>
          {T(d.amount, 12.5, C.ink, '900')}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function DueSoonWidget({ s }: { s: WidgetSnapshot }) {
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: PAPER }}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        {T('DUE SOON', 11, C.rose, '800')}
        {T(`${s.dueLeft} left to pay`, 11, C.muted, '700')}
      </FlexWidget>
      <DueRows s={s} max={3} />
    </FlexWidget>
  );
}

export function MonthWidget({ s }: { s: WidgetSnapshot }) {
  const colors = [C.pink, '#3D6FD9', '#E2556F'];
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: PAPER, justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          {T('LEFT TO SPEND', 11, C.rose, '800')}
          {T(s.lts, 24, s.ltsNegative ? C.red : C.ink, '900')}
        </FlexWidget>
        <FlexWidget style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: C.tint }}>{T(payday(s), 11, C.rose, '800')}</FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 8 }}>
        {s.budgets.map((b, i) => (
          <FlexWidget key={i} style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center', paddingVertical: 3 }}>
            <TextWidget text={b.name} truncate="END" maxLines={1} style={{ width: 70, fontSize: 11.5, color: C.ink, fontWeight: '800' }} />
            <SvgWidget svg={bar(b.pct, colors[i % 3])} style={{ width: 150, height: 8 }} />
            <TextWidget text={b.spent} style={{ marginLeft: 8, fontSize: 11.5, color: C.ink, fontWeight: '800' }} />
          </FlexWidget>
        ))}
      </FlexWidget>
      <DueRows s={s} max={2} />
      <Buttons onCrimson={false} />
    </FlexWidget>
  );
}

export function TripWidget({ s }: { s: WidgetSnapshot }) {
  if (!s.trip) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: BLUE, justifyContent: 'center' }}>
        {T('NO TRIP RIGHT NOW', 11, C.white, '800')}
        {T('Your trip shows here while its dates are on.', 12, C.white, '700', { marginTop: 4 })}
      </FlexWidget>
    );
  }
  const tr = s.trip;
  const track = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="8" viewBox="0 0 280 8"><rect width="280" height="8" rx="4" fill="#FFFFFF" fill-opacity="0.25"/><rect width="${Math.max(4, (tr.pct / 100) * 280).toFixed(1)}" height="8" rx="4" fill="#FFFFFF"/></svg>`;
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: BLUE, justifyContent: 'space-between' }}>
      {T(`${tr.name.toUpperCase()} · ${tr.dayText.toUpperCase()}`, 11, C.white, '800')}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {T(tr.spent, 22, C.white, '900')}
          {T(` of ${tr.budget}`, 12, C.white, '700')}
        </FlexWidget>
        <FlexWidget style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>{T(`${tr.left} left`, 11, C.white, '800')}</FlexWidget>
      </FlexWidget>
      <SvgWidget svg={track} style={{ width: 'match_parent', height: 8 }} />
      <Buttons onCrimson />
    </FlexWidget>
  );
}

export function EmptyWidget() {
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', borderRadius: 24, padding: 14, backgroundGradient: PAPER, justifyContent: 'center', alignItems: 'center' }}>
      {T('Finance Flow', 14, C.rose, '900')}
      {T('Open the app once to fill this in.', 11.5, C.muted, '700')}
    </FlexWidget>
  );
}

export function widgetFor(name: string, s: WidgetSnapshot | null): React.JSX.Element {
  if (name === 'SayIt') return <SayItWidget />;
  if (!s) return <EmptyWidget />;
  switch (name) {
    case 'LeftToSpend':
      return <LeftToSpendWidget s={s} />;
    case 'SpendSay':
      return <SpendSayWidget s={s} />;
    case 'DueSoon':
      return <DueSoonWidget s={s} />;
    case 'Month':
      return <MonthWidget s={s} />;
    case 'Trip':
      return <TripWidget s={s} />;
    default:
      return <EmptyWidget />;
  }
}
