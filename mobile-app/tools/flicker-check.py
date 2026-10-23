#!/usr/bin/env python3
"""Smoothness check, 2026-10-23 (Cath: no button or page may flicker, no screens may
overlap, fades must be smooth). Reads the frames tools/browser-walk.mjs recorded with a
"rec:" step (web-shots/rec-NN/) and reports, per recording:

  FLICKER    something changed for one or two frames and then went back (A-B-A)
  BLANK      a sudden cut to a nearly empty frame mid-change (a blink between screens)
  LATE POP   the screen had settled, then changed again (content or a button popping in)
  SNAP       a big change that happened all at once (no slide or fade at all)
  JUMP       one frame changed a big part of the screen at once while things were moving
             (a snap instead of a smooth slide or fade)
  duration   how long the change took, first to last moving frame

and writes sheet.png (every frame, small, in order) to look at by eye.

Faint changes (the falling leaves behind the app) are ignored: a pixel only counts as
changed when it moves by more than THRESH grey levels.

Usage: python3 -I tools/flicker-check.py web-shots/rec-01 [web-shots/rec-02 ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

THRESH = 28  # grey levels; the leaves change by less than this
MOVING = 0.002  # 0.2 % of the screen changing = something is moving
SETTLED_FRAMES = 4  # this many still frames in a row = settled
SCALE = 2  # analyse at half size


def load(p):
    im = Image.open(p).convert('L')
    im = im.resize((im.width // SCALE, im.height // SCALE))
    return np.asarray(im, dtype=np.int16)


def changed(a, b):
    if a.shape != b.shape:
        return 1.0
    return float((np.abs(a - b) > THRESH).mean())


def check(folder):
    folder = Path(folder)
    files = sorted(folder.glob('f*.png'))
    meta = json.loads((folder / 'times.json').read_text()) if (folder / 'times.json').exists() else {}
    times = meta.get('times') or list(range(len(files)))
    step = meta.get('step', folder.name)
    if len(files) < 3:
        return {'step': step, 'frames': len(files), 'problems': [], 'note': 'too few frames (nothing moved?)'}
    fr = [load(p) for p in files]
    t0 = times[0]
    ms = [round((t - t0) * 1000) if isinstance(t, float) else t for t in times]
    d = [0.0] + [changed(fr[i - 1], fr[i]) for i in range(1, len(fr))]
    problems = []

    # FLICKER: frame i (or i, i+1) differs from both sides, while the sides match.
    for i in range(1, len(fr) - 1):
        if d[i] > 0.01 and changed(fr[i - 1], fr[i + 1]) < 0.002:
            problems.append(f'FLICKER at {ms[i]} ms: frame {i + 1} flashes and goes back')
    for i in range(1, len(fr) - 2):
        if d[i] > 0.01 and changed(fr[i - 1], fr[i + 2]) < 0.002 and changed(fr[i], fr[i + 1]) > 0.002:
            problems.append(f'FLICKER at {ms[i]} ms: frames {i + 1}-{i + 2} flash and go back')

    # BLANK: a nearly uniform frame while the first and last are not.
    std = [float(f.std()) for f in fr]
    if std[0] > 12 and std[-1] > 12:
        for i in range(1, len(fr) - 1):
            # Only a sudden cut to empty counts; the bottom of a soft dip (old fades out,
            # then new fades in, Cath's choice) passes through the background gently.
            if std[i] < 6 and std[i - 1] >= 6 and d[i] > 0.25:
                problems.append(f'BLANK at {ms[i]} ms: frame {i + 1} cut to nearly empty at once')

    # Moving span, LATE POP and JUMP.
    moving = [i for i in range(1, len(fr)) if d[i] > MOVING]
    duration = (ms[moving[-1]] - ms[moving[0]]) if moving else 0
    if moving:
        still = 0
        settled_at = None
        for i in range(moving[0], len(fr)):
            still = still + 1 if d[i] <= MOVING else 0
            if still >= SETTLED_FRAMES and settled_at is None:
                settled_at = i
            if settled_at is not None and d[i] > 0.01:
                problems.append(f'LATE POP at {ms[i]} ms: the screen changed again after settling ({d[i] * 100:.0f}% of it)')
                settled_at = None
                still = 0
        if len(moving) >= 3:
            for i in moving:
                if d[i] > 0.35 and i not in (moving[0], moving[-1]):
                    problems.append(f'JUMP at {ms[i]} ms: {d[i] * 100:.0f}% of the screen changed in one frame')

    # SNAP: something big changed, but all in one or two frames (no slide, no fade).
    if moving and len(moving) <= 2 and max(d) > 0.03:
        i = max(range(len(d)), key=lambda k: d[k])
        problems.append(f'SNAP at {ms[i]} ms: {d[i] * 100:.0f}% of the screen changed at once, with no animation')

    # Contact sheet.
    thumbs = [Image.open(p).convert('RGB').resize((98, 212)) for p in files]
    cols = 10
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 100, rows * 214), 'white')
    for k, t in enumerate(thumbs):
        sheet.paste(t, ((k % cols) * 100, (k // cols) * 214))
    sheet.save(folder / 'sheet.png')
    return {'step': step, 'frames': len(fr), 'duration_ms': duration, 'problems': problems}


if __name__ == '__main__':
    bad = 0
    for arg in sys.argv[1:]:
        r = check(arg)
        status = 'ok  ' if not r['problems'] else 'FAIL'
        bad += bool(r['problems'])
        print(f"{status} {r['step']}: {r['frames']} frames, moving {r.get('duration_ms', 0)} ms {r.get('note', '')}")
        for p in r['problems']:
            print('     ' + p)
    sys.exit(1 if bad else 0)
