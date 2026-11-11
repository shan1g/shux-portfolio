// The hero's lettering, after Juri Zaech's Mux typeface: monospaced seven-segment construction, with the grid broken
// only where a letter needs it (a split diagonal for N, a leg for R, a forked stem for Y, a half bar for G). Weight is
// a single number from 0 to 1. At 0 the segments are thin, round-ended LED bars with a clear break at every joint.
// Towards 1 they thicken inward a little, as Mux's weights do: the letter's outer edge holds and the strokes grow
// into the counters, while the breaks at the joints stay open.

export const CELL_W = 60;
export const CELL_H = 100;
// Mux is monospaced and set tight: at the heaviest weights neighbours nearly touch.
const ADVANCE = 76;
// How far each segment stops short of a joint: wide enough that the thin weight shows a clear break at corners too.
const JOINT_GAP = 9;
// Stroke width at weight 0 and at weight 1. Kept light (about Mux Medium) so the joint breaks stay open and the name
// stays readable behind the glass panes at the end of the scroll.
const THIN = 8;
const HEAVY = 14;
// The outer edge stays put at every weight, so only the thin stroke's half-width needs room.
export const PAD = THIN / 2 + 2;

type Point = readonly [number, number];
type Line = readonly [Point, Point];

const W = CELL_W;
const H = CELL_H;
const MID = H / 2;
const CX = W / 2;

const SEGMENTS = {
  a: [[0, 0], [W, 0]],
  b: [[W, 0], [W, MID]],
  c: [[W, MID], [W, H]],
  d: [[0, H], [W, H]],
  e: [[0, MID], [0, H]],
  f: [[0, 0], [0, MID]],
  g: [[0, MID], [W, MID]],
  gHalf: [[CX, MID], [W, MID]],
  // N's diagonal breaks at the middle, like every other joint.
  nDiagTop: [[0, 0], [CX, MID]],
  nDiagBottom: [[CX, MID], [W, H]],
  rLeg: [[CX, MID], [W, H]],
  yLeft: [[0, 0], [CX, MID]],
  yRight: [[W, 0], [CX, MID]],
  yStem: [[CX, MID], [CX, H]],
} as const satisfies Record<string, Line>;

type SegmentName = keyof typeof SEGMENTS;

// The classic seven, drawn faintly where a letter leaves them unlit.
const BASE: readonly SegmentName[] = ["a", "b", "c", "d", "e", "f", "g"];

const GLYPHS: Record<string, readonly SegmentName[]> = {
  S: ["a", "f", "g", "c", "d"],
  H: ["f", "e", "b", "c", "g"],
  A: ["a", "b", "c", "e", "f", "g"],
  N: ["f", "e", "b", "c", "nDiagTop", "nDiagBottom"],
  G: ["a", "f", "e", "d", "c", "gHalf"],
  R: ["a", "b", "f", "e", "g", "rLeg"],
  Y: ["yLeft", "yRight", "yStem"],
};

/** One placed segment: its line in the glyph's cell and the glyph's offset along the word. */
export type Segment = { offset: number; line: Line };

export type WordLayout = {
  text: string;
  width: number;
  height: number;
  viewBox: string;
  lit: Segment[];
  unlit: Segment[];
};

export function layoutWord(text: string): WordLayout {
  const lit: Segment[] = [];
  const unlit: Segment[] = [];
  [...text].forEach((ch, i) => {
    const on = GLYPHS[ch] ?? [];
    const offset = i * ADVANCE;
    for (const name of on) lit.push({ offset, line: SEGMENTS[name] });
    for (const name of BASE) if (!on.includes(name)) unlit.push({ offset, line: SEGMENTS[name] });
  });
  const width = (text.length - 1) * ADVANCE + W + PAD * 2;
  const height = H + PAD * 2;
  return { text, width, height, viewBox: `${-PAD} ${-PAD} ${width} ${height}`, lit, unlit };
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const smooth = (k: number) => k * k * (3 - 2 * k);

/** A segment's line and stroke width at a weight from 0 (thin LED bar) to 1 (heavy, merged at the joints). */
export function segmentAt(s: Segment, weight: number) {
  const k = smooth(Math.min(1, Math.max(0, weight)));
  const width = THIN + (HEAVY - THIN) * k;
  // The skeleton pulls in by the extra half-width, so the letter's outer edge holds and the stroke grows inward.
  const inset = (width - THIN) / 2;
  const sx = (W - 2 * inset) / W;
  const sy = (H - 2 * inset) / H;
  const [[x0, y0], [x1, y1]] = s.line;
  const ax = s.offset + inset + x0 * sx;
  const ay = inset + y0 * sy;
  const bx = s.offset + inset + x1 * sx;
  const by = inset + y1 * sy;
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  // The break at each joint stays the same size; as the round ends grow they overlap into Mux's pinched notches.
  const gap = Math.min(JOINT_GAP, len / 2 - 0.5);
  return {
    x1: r2(ax + ux * gap),
    y1: r2(ay + uy * gap),
    x2: r2(bx - ux * gap),
    y2: r2(by - uy * gap),
    width: r2(width),
  };
}
