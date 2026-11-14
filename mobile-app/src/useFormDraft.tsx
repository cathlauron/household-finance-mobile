import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './components/Tap';
import { Text } from './components/AppText';
import { useTheme } from './ThemeContext';
import { drafts } from './drafts';
import { trace } from './trace';
import { animateNextLayout } from './animateLayout';

// Cath, 2026-11-13 (mockup money-batch-4, change 2): every add form keeps what was typed when it is
// closed by a tap outside it or a swipe down, and opens with it next time. Cancel and Add throw it
// away. One piece for every form, so they all behave the same:
//
//   const draft = useFormDraft('bill', { name: [nameInput, setNameInput], ... }, { editing: !!editingId, typed });
//   open the form   -> draft.restore()            (after the form's own reset)
//   sheet onClose   -> draft.keep(), then close
//   Cancel          -> draft.discard(), then close
//   Add worked      -> draft.used()
//   in the sheet    -> <DraftBanner draft={draft} onStartOver={resetTheForm} />
type Field = [value: unknown, set: (v: any) => void];

export type FormDraft = {
  resumed: boolean;
  restore: (skip?: string[]) => void;
  keep: () => void;
  discard: () => void;
  used: () => void;
  startOver: () => void;
};

export function useFormDraft(form: string, fields: Record<string, Field>, opts: { editing: boolean; typed: boolean }): FormDraft {
  const [resumed, setResumed] = useState(false);
  const latest = useRef({ fields, opts });
  latest.current = { fields, opts };
  const forget = () => {
    setResumed(false);
    drafts.clear(form);
  };
  return {
    resumed,
    restore(skip = []) {
      setResumed(false);
      drafts.load(form).then((d) => {
        if (!d) return;
        const now = latest.current.fields;
        Object.keys(now).forEach((k) => {
          if (skip.includes(k) || d[k] === undefined || d[k] === null) return;
          // Only what the field can hold: the same kind of value it has now, or an amount.
          const have = now[k][0];
          const same = typeof d[k] === typeof have || (typeof d[k] === 'number' && have === '') || (typeof have === 'number' && d[k] === '') || have === undefined || have === null;
          if (same) now[k][1](d[k]);
        });
        trace('draft', 'restored', { form });
        animateNextLayout(); // the note fades in; it never pops in and pushes the form down
        setResumed(true);
      });
    },
    keep() {
      const { fields: now, opts: o } = latest.current;
      if (o.editing) return;
      if (!o.typed) {
        drafts.clear(form);
        return;
      }
      const values: Record<string, unknown> = {};
      Object.keys(now).forEach((k) => { values[k] = now[k][0]; });
      drafts.save(form, values);
    },
    discard() {
      if (!latest.current.opts.editing) forget();
    },
    used() {
      if (!latest.current.opts.editing) forget();
    },
    startOver() {
      forget();
      trace('draft', 'start over', { form });
    },
  };
}

export function DraftBanner({ draft, onStartOver }: { draft: FormDraft; onStartOver: () => void }) {
  const { colors } = useTheme();
  if (!draft.resumed) return null;
  return (
    <View style={[styles.box, { backgroundColor: colors.okBg }]} testID="draft-banner">
      <Text style={[styles.text, { color: colors.ink }]}>Picked up where you left off</Text>
      <TouchableOpacity
        onPress={() => {
          draft.startOver();
          onStartOver();
        }}
        accessibilityRole="button"
        testID="draft-start-over"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.text, { color: colors.gold, fontWeight: '700' }]}>Start over</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginBottom: 10 },
  text: { fontSize: 14 },
});
