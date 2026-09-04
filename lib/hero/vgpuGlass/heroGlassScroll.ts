/** Complete fractal → orb → fractal morph cycles across the whole document. */
export const PAGE_MORPH_CYCLES = 3;

/**
 * Deadband, in phase units, either side of each square-wave edge. Sub-pixel
 * scroll jitter at a boundary would otherwise flip the endpoint every frame and
 * restart the eased morph before it could finish.
 */
export const SHAPE_STATE_HYSTERESIS = 0.04;

export type HeroShapeState = 0 | 1;

/**
 * Map full-document scroll progress (0–1) to a morph ENDPOINT
 * (0 = fractal, 1 = orb).
 *
 * The vgpu glass-fractal example never scrubs sphereMix: it drives the shape to
 * one of the two authored endpoints and eases the transition over a fixed
 * duration, which is what produces the tip-led unfurl and the settle at the
 * other end. Scroll therefore selects the endpoint and the renderer owns the
 * transition — mapping progress straight onto sphereMix flattens that easing
 * back out into a linear slide.
 *
 * The wave keeps the same period as the previous triangle mapping, so the number
 * of transitions across the document is unchanged.
 */
export function pageProgressToShapeState(
  progress: number,
  previous: HeroShapeState = 0,
  cycles: number = PAGE_MORPH_CYCLES,
): HeroShapeState {
  const t = Math.min(1, Math.max(0, progress));
  const phase = (t * cycles) % 1;
  if (previous === 0) {
    return phase > 0.5 + SHAPE_STATE_HYSTERESIS &&
      phase < 1 - SHAPE_STATE_HYSTERESIS
      ? 1
      : 0;
  }
  return phase < 0.5 - SHAPE_STATE_HYSTERESIS ? 0 : 1;
}
