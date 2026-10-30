import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { SettingsGroup, PlainRow, SegmentRow } from '../components/SettingsHub';
import PeelSticker from '../components/PeelSticker';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { TEXT_SIZE_OPTIONS, setTextSize, useTextSize } from '../textSize';
import { useFabSide, setFabSide } from '../fabSide';
import { useSkyPrefs, setSkyGlowOn, setLiveWeatherOn, setRainAnimOn, usePreviewWeather, setPreviewWeather } from '../sky';
import { getHomeZoneCity, setHomeZoneToPhone, phoneTimeZone, cityOf } from '../travelTime';
import LargeHeader from '../navigation/LargeHeader';
import { darkSticker, endScreenPeel, screenPeelK, showScreenPeel } from '../screenPeel';

// Settings › Appearance. Version 3.2 (mockup K2e, approved by Cath 2026-10-29): the on/off
// settings are peel-off stickers. Theme is "Match my phone" + "Dark mode" (Cath's pick);
// while Match my phone is on, Dark mode is greyed out and follows the phone.
// Peeling Dark mode peels the whole screen from its top-right corner (src/screenPeel.tsx):
// the page shows underneath in the other look. `still` draws this page as that copy.

export type ScrollFrame = { y: number; height: number; scrollY: number; padTop: number; padX: number };

let lastZoneCity: string | null = null;

export default function AppearancePage({
  still,
  getFrame,
  onPeeling,
}: {
  still?: boolean;
  getFrame?: () => Promise<ScrollFrame>;
  // While a sticker is held the page doesn't scroll (a diagonal peel isn't a scroll).
  onPeeling?: (peeling: boolean) => void;
}) {
  const { mode, setMode, isDark } = useTheme();
  const { model, saveModel } = useData();
  const textSize = useTextSize();
  const fabSide = useFabSide();
  const skyPrefs = useSkyPrefs();
  const previewWeather = usePreviewWeather();
  const [homeZoneCity, setHomeZoneCity] = useState<string | null>(lastZoneCity);
  const [weatherKey, setWeatherKey] = useState(0);
  useEffect(() => {
    if (still) return;
    getHomeZoneCity()
      .then((c) => {
        lastZoneCity = c;
        setHomeZoneCity(c);
      })
      .catch(() => {});
  }, [still]);
  if (!model) return null;
  const hold = { onPeelStart: () => onPeeling?.(true), onPeelEnd: () => onPeeling?.(false) };

  // The copy of this page, drawn in the other look, peeled into view under the screen.
  async function startDarkPeel(toDark: boolean) {
    const f = await getFrame?.().catch(() => null);
    if (!f) return;
    showScreenPeel(<PeelCopy frame={f} />, toDark);
  }

  return (
    <>
      <SettingsGroup label="Theme" plain footer="Match my phone: light or dark follows your phone's own setting.">
        <PlainRow
          title="Match my phone"
          right={
            <PeelSticker
              {...hold}
              testID="settings-theme-match"
              still={still}
              accessibilityLabel="Match my phone"
              value={mode === 'device'}
              onChange={(on) => setMode(on ? 'device' : isDark ? 'dark' : 'light')}
            />
          }
        />
        <PlainRow
          title="Dark mode"
          right={
            <PeelSticker
              testID="settings-theme-dark"
              still={still}
              wide
              offLabel="☀ Light"
              onLabel="☾ Dark"
              accessibilityLabel="Dark mode"
              value={isDark}
              disabled={mode === 'device'}
              lendTo={still ? undefined : darkSticker}
              borrow={still ? darkSticker.current : undefined}
              screenK={still ? undefined : screenPeelK}
              onPeelStart={(toOn) => {
                onPeeling?.(true);
                startDarkPeel(toOn);
              }}
              onPeelEnd={(flipped) => {
                onPeeling?.(false);
                endScreenPeel(flipped);
              }}
              onChange={(on) => setMode(on ? 'dark' : 'light')}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup plain>
        <SegmentRow title="Text size" options={TEXT_SIZE_OPTIONS} value={textSize} onChange={setTextSize} testIDPrefix="settings-text" />
        <SegmentRow
          title="+ button side"
          options={[{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }]}
          value={fabSide}
          onChange={(v) => setFabSide(v as 'left' | 'right')}
          testIDPrefix="settings-fab"
        />
      </SettingsGroup>

      <SettingsGroup
        label="Sky"
        plain
        footer="Live weather uses your phone's approximate location to match the sky on Home to your real sunrise, sunset and weather. Only a rounded location is sent to the weather service (Open-Meteo), never your money data. Rain stops falling when Reduce Motion is on."
      >
        <PlainRow
          title="Time-of-day glow"
          right={<PeelSticker {...hold} testID="settings-sky-glow" still={still} accessibilityLabel="Time-of-day glow" value={skyPrefs.glowOn} onChange={(on) => setSkyGlowOn(on)} />}
        />
        <PlainRow
          title="Live weather"
          right={
            <PeelSticker
              {...hold}
              key={weatherKey}
              testID="settings-live-weather"
              still={still}
              accessibilityLabel="Live weather"
              value={skyPrefs.liveWeatherOn}
              onChange={async (on) => {
                const ok = await setLiveWeatherOn(on);
                if (!ok) {
                  // No location: the sticker goes back to Off.
                  setWeatherKey((k) => k + 1);
                  Alert.alert(
                    'Location is off',
                    "Finance Flow can't see your location, so the sky follows the clock instead. You can allow location for Finance Flow in your phone's settings."
                  );
                }
              }}
            />
          }
        />
        <PlainRow
          title="Rain animation"
          right={<PeelSticker {...hold} testID="settings-rain-anim" still={still} accessibilityLabel="Rain animation" value={skyPrefs.rainAnimOn} onChange={(on) => setRainAnimOn(on)} />}
        />
        {__DEV__ && (
          <SegmentRow
            title="Preview weather (testing only)"
            options={[
              { id: 'live', label: 'Live' },
              { id: 'clear', label: 'Clear' },
              { id: 'cloudy', label: 'Cloudy' },
              { id: 'rain', label: 'Rain' },
            ]}
            value={previewWeather ?? 'live'}
            onChange={(v) => setPreviewWeather(v === 'live' ? null : (v as 'clear' | 'cloudy' | 'rain'))}
            testIDPrefix="settings-preview-weather"
          />
        )}
      </SettingsGroup>

      <SettingsGroup label="Time" plain footer="Finance Flow always uses this phone's date and time. When the phone is in another time zone, Home shows a small note.">
        <PlainRow
          title="Home time zone"
          value={homeZoneCity ?? '…'}
          testID="settings-home-zone"
          onPress={() => {
            const tz = phoneTimeZone();
            const here = tz ? cityOf(tz) : null;
            if (!here || here === homeZoneCity) {
              Alert.alert('Home time zone', `Home is ${homeZoneCity ?? 'this phone'}. When you travel, Home shows how far you are from it. To change it, open this while your phone is set to the new place.`);
              return;
            }
            Alert.alert('Change home time zone?', `Make ${here} (this phone's time zone now) your home instead of ${homeZoneCity}?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: `Make ${here} home`,
                onPress: () =>
                  setHomeZoneToPhone().then((c) => {
                    if (c) {
                      lastZoneCity = c;
                      setHomeZoneCity(c);
                    }
                  }),
              },
            ]);
          }}
        />
      </SettingsGroup>

      <SettingsGroup label="Feel" plain footer="Mood colours: the card, buttons and leaves follow Left to Spend.">
        <PlainRow
          title="Mood colours"
          right={
            <PeelSticker
              {...hold}
              testID="settings-mood-colors"
              still={still}
              accessibilityLabel="Mood colours"
              value={model.settings.moodColorsEnabled !== false}
              onChange={(on) => saveModel({ ...model, settings: { ...model.settings, moodColorsEnabled: on } })}
            />
          }
        />
        <PlainRow
          title="Falling leaves"
          right={
            <PeelSticker
              {...hold}
              testID="settings-falling-leaves"
              still={still}
              accessibilityLabel="Falling leaves"
              value={model.settings.fallingLeavesEnabled !== false}
              onChange={(on) => saveModel({ ...model, settings: { ...model.settings, fallingLeavesEnabled: on } })}
            />
          }
        />
      </SettingsGroup>

      {/* Version 2.2 (Cath): swipe to delete was removed entirely; delete from an item's
          own page or its Edit form instead. */}

      <SettingsGroup plain>
        <PlainRow title="Language" value="English" />
      </SettingsGroup>
    </>
  );
}

// The Appearance page as it sits on the screen right now (header, then the page scrolled to
// the same place), for the screen peel. It is drawn in the other look by the peel host.
function PeelCopy({ frame }: { frame: ScrollFrame }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy2 }} pointerEvents="none">
      <LargeHeader navigation={{ goBack() {} }} route={{ name: 'SettingsPage' }} options={{ title: 'Appearance', headerBackTitle: 'Settings' }} back={{ title: 'Settings' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: frame.y, height: frame.height, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: frame.padX, paddingTop: frame.padTop, transform: [{ translateY: -frame.scrollY }] }}>
          <AppearancePage still />
        </View>
      </View>
    </View>
  );
}
