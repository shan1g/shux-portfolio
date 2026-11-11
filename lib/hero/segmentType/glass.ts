// The glass panes in front of the hero lettering: clear slabs that shift and magnify the letters behind them, with
// red and blue fringes at the edges, and at the outer ends of the name frosted panes that smear the letters sideways.
// Geometry is in a word's glyph units (as in glyphs.ts: a letter is 60 wide and 100 tall, the next one starts 76
// along).

export type GlassPane = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** A clear slab that shifts and magnifies, or a frosted one that smears sideways. */
  kind: "lens" | "smear";
  /** How far the pane slides across the hero scroll. */
  drift: number;
  /** How far the letters behind it appear shifted sideways. */
  shift: number;
  /** How much it magnifies about its own centre. */
  zoom: number;
};

export const PANE_RADIUS = 3;
// The inner edge that reads as the glass's thickness, inset from the rim.
export const PANE_INSET = 3;
// How far the rim's red and blue fringes sit either side of it.
export const FRINGE = 0.8;

// The first word's panes: a frosted pane over the start of the name, then two clear slabs over the joins between
// letters, each a different height so they never line up. The second word gets the same, mirrored, so the frosted
// panes sit at both outer ends of the name.
const FIRST_WORD: readonly GlassPane[] = [
  { x: -20, y: -16, w: 54, h: 132, kind: "smear", drift: 14, shift: 3, zoom: 1 },
  { x: 98, y: -10, w: 58, h: 122, kind: "lens", drift: -26, shift: 7, zoom: 1.1 },
  { x: 196, y: -20, w: 46, h: 136, kind: "lens", drift: 18, shift: -6, zoom: 1.06 },
];

/** The panes for the word at `index`, mirrored on every second word. `span` is the word's glyph width. */
export function panesFor(index: number, span: number): GlassPane[] {
  if (index % 2 === 0) return FIRST_WORD.map((p) => ({ ...p }));
  return FIRST_WORD.map((p) => ({
    ...p,
    x: span - p.x - p.w,
    drift: -p.drift,
    shift: -p.shift,
  }));
}

export const r2 = (v: number) => Math.round(v * 100) / 100;

/** How the letters behind a pane are seen through it once it has slid `dx` along: magnified about its centre and shifted. */
export function lensTransform(p: GlassPane, dx: number): string {
  const cx = p.x + p.w / 2 + dx;
  const cy = p.y + p.h / 2;
  return `translate(${r2(cx + p.shift)} ${r2(cy)}) scale(${p.zoom}) translate(${r2(-cx)} ${r2(-cy)})`;
}
