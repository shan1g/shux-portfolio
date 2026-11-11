"""Score for the SHUX robotic chameleon's teardown (cutaway-ref/chameleon), on the cutaway kit's sound kit.

A bed in A minor (Am9, Fmaj7, Dm9, E7sus at 88 bpm: e-piano, bass, soft drums and a pad on the same changes) at one
level the whole way, and short quiet accents on each part as it moves: a slide and plate clicks as the head and the
casque come off, thread ticks as the eye housings back out of the head and a blip for the LEDs, servo ticks as the
legs swing out from the flank and a run of small ticks as the tail's joints open, a rising air into the full explode,
a falling air and three seating clicks as it goes back together, and a soft snap once it is whole. No drones.

    python "<cutaway skill>/run_sfx.py" cutaway-ref/chameleon/score.py

Every cue comes from timeline.json next to this file; main.js reads the same beats for the explode and the cameras.
The offsets inside each act follow the parts' explode windows in chameleon.js.
"""

import os

from sfx.score_kit import airy, bed, chords, hz, thud  # noqa: E402
from sfx.synth import blip, click, envelope, pad  # noqa: E402

TIMELINE = os.environ.get("TL", "timeline.json")
OUT = os.environ.get("OUT", os.path.join(os.environ.get("CUTAWAY_OUT", "cutaway-out"), "chameleon-score.wav"))
TARGET_LUFS = -14.0
SEED = 23
BPM = 88

CHORDS = chords("Am9:A2 C3 E3 G3 B3/A1", "Fmaj7:F2 A2 C3 E3 A3/F1", "Dm9:D3 F3 A3 C4 E4/D2", "E7sus:E2 A2 B2 D3 G3/E1")
MOTIF = [(0.5, hz("E5")), (1.5, hz("C5")), (2.5, hz("B4"))]


def snap(mix, t, level=0.06, pan=0.0):
    """A part seating: a short click on a soft low knock."""
    mix.put(t, click(1500, 0.03), level, pan=pan)
    mix.put(t, thud(110, 0.06, 0.25), level * 0.5, pan=pan)


def score(mix, tl):
    dur = tl["duration"]
    beat = {e["act"]: e["t"] for e in tl["script"]}

    left, right, low, drums = bed(dur, BPM, CHORDS, MOTIF, motif_voice="blip", kicks=(0, 2.5), snares=(1, 3), hats=8,
                                  swing=0.08, keys_vel=0.75, keys_lp=3600)
    mix.put_stereo(0, left, right, 0.13)
    mix.put(0, low, 0.13)
    mix.put(0, drums, 0.05)
    bar = 4 * 60 / BPM
    changes = [(0.12 + b * bar, [f for f in CHORDS[b % len(CHORDS)][0][:4]]) for b in range(int(dur / bar) + 1)]
    pl, pr = pad(dur, changes, volume=envelope([(0, 0), (1.0, 1), (dur - 1.6, 1), (dur, 0)]), detune=0.8, tremolo=0.18,
                 xfade=0.5)
    mix.put_stereo(0, pl, pr, 0.07)

    for e in tl["script"]:
        t, act = e["t"], e["act"]
        if act == "head":
            # the head slides off toward the left of frame, the casque lifts off it
            mix.put(t + 0.7, airy(1.6, 500, 1500, 0.6), 0.02, pan=-0.3)
            for k in range(4):
                mix.put(t + 1.0 + 0.08 * k, click(2400 - 120 * k, 0.02), 0.03, pan=-0.25)
            mix.put(t + 1.8, click(1900, 0.03), 0.045, pan=-0.2)
        elif act == "eye":
            # the eye housings back out of the head on their threads, the LED column follows
            for i in range(6):
                mix.put(t + 0.3 + 0.12 * i, click(3200 - 150 * i, 0.018), 0.03, pan=-0.2)
            mix.put(t + 1.1, blip(hz("E6"), 0.4, 0.15), 0.014, pan=-0.1)
        elif act == "legs":
            # the legs swing out from the flank on their hips, the tail opens a gap at every joint
            mix.put(t + 0.3, airy(1.0, 700, 2000, 0.5), 0.014, pan=0.25)
            for k in range(8):
                mix.put(t + 0.2 + 0.09 * k, click(2600 + 80 * k, 0.016), 0.028, pan=0.25)
            for j in range(12):
                mix.put(t + 0.6 + 0.05 * j, click(3600 + 60 * j, 0.012), 0.018, pan=0.3 + 0.01 * j)
        elif act == "exploded":
            # the last parts reach their ends: a rising air into it and a single high note as it hangs apart
            mix.put(t - 1.2, airy(1.4, 450, 2400, 0.7), 0.03, pan=-0.1)
            mix.put(t + 0.05, blip(hz("A5"), 0.3, 0.1), 0.022)
        elif act == "assemble":
            span = beat["hero"] - t
            mix.put(t, airy(1.2, 2200, 600, 0.5), 0.02, pan=0.15)
            for i, k in enumerate((0.55, 0.75, 0.92)):
                mix.put(t + span * k, click(2000 + 300 * i, 0.03), 0.05, pan=-0.3 + 0.3 * i)
        elif act == "hero":
            snap(mix, t + 0.05, 0.06, pan=0.1)
            mix.put(t + 0.2, airy(0.9, 500, 1500, 0.5), 0.014, pan=0.2)
