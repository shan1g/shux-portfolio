/**
 * Scroll-driven shape endpoints for the hero glass.
 *
 * The vgpu glass-fractal example never scrubs `sphereMix`: its Fractal / Orb
 * switch drives the shape to one of two authored endpoints and the renderer
 * eases the transition over a fixed duration. That ease produces the tip-led
 * unfurl and the settle. Scroll therefore acts as the switch: each
 * `[data-glass-shape]` zone on the page declares which endpoint it shows. A
 * zone can declare a sequence such as `"orb fractal orb fractal"`, which splits
 * it into equal segments, so the long hero pin flips once per chapter.
 */
export type HeroShapeState = 0 | 1;

export const HERO_SHAPE_FRACTAL: HeroShapeState = 0;
export const HERO_SHAPE_ORB: HeroShapeState = 1;

/**
 * Deadband, in segment units, either side of a segment boundary. Sub-pixel
 * scroll jitter at a boundary would otherwise flip the endpoint every frame and
 * restart the eased morph before it could finish.
 */
export const SHAPE_SEGMENT_HYSTERESIS = 0.06;

/** Parses a `data-glass-shape` value such as `"orb fractal"` into endpoints. */
export function parseShapeSequence(value: string | undefined): HeroShapeState[] {
  const sequence = (value ?? "")
    .split(/[\s,]+/)
    .map((token) => token.trim().toLowerCase())
    .flatMap((token): HeroShapeState[] =>
      token === "fractal"
        ? [HERO_SHAPE_FRACTAL]
        : token === "orb"
          ? [HERO_SHAPE_ORB]
          : [],
    );
  return sequence.length > 0 ? sequence : [HERO_SHAPE_ORB];
}

/**
 * Maps a zone's scroll progress (0–1) to a segment index. Pass `previous = -1`
 * to resolve without hysteresis, for example on first paint or refresh.
 */
export function zoneProgressToSegment(
  progress: number,
  count: number,
  previous: number,
): number {
  if (count <= 1) return 0;
  const raw = Math.min(1, Math.max(0, progress)) * count;
  const next = Math.min(count - 1, Math.floor(raw));
  if (previous < 0 || next === previous) return next;
  // The boundary between `previous` and the neighbouring segment toward `next`.
  const edge = next > previous ? previous + 1 : previous;
  return Math.abs(raw - edge) > SHAPE_SEGMENT_HYSTERESIS ? next : previous;
}
