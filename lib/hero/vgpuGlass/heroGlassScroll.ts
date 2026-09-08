/**
 * Document progress at which the shape endpoint flips from orb to fractal. The
 * page lands on the orb and has fully become the fractal by the time the
 * visitor is a little under halfway down, so the fractal — the more detailed of
 * the two endpoints — is on screen for the majority of the scroll.
 */
export const SHAPE_CROSSOVER = 0.42;

/**
 * Deadband, in progress units, either side of the crossover. Sub-pixel scroll
 * jitter at the boundary would otherwise flip the endpoint every frame and
 * restart the eased morph before it could finish.
 */
export const SHAPE_STATE_HYSTERESIS = 0.04;

export type HeroShapeState = 0 | 1;

/**
 * Map full-document scroll progress (0–1) to a morph ENDPOINT
 * (1 = orb, 0 = fractal).
 *
 * The vgpu glass-fractal example never scrubs sphereMix: it drives the shape to
 * one of the two authored endpoints and eases the transition over a fixed
 * duration, which is what produces the tip-led unfurl and the settle at the
 * other end. Scroll therefore selects the endpoint and the renderer owns the
 * transition — mapping progress straight onto sphereMix flattens that easing
 * back out into a linear slide.
 *
 * This is a single monotonic edge rather than the previous repeating square
 * wave: one orb -> fractal journey across the page instead of six alternating
 * transitions.
 */
export function pageProgressToShapeState(
  progress: number,
  previous: HeroShapeState = 1,
  crossover: number = SHAPE_CROSSOVER,
): HeroShapeState {
  const t = Math.min(1, Math.max(0, progress));
  if (previous === 1) {
    return t > crossover + SHAPE_STATE_HYSTERESIS ? 0 : 1;
  }
  return t < crossover - SHAPE_STATE_HYSTERESIS ? 1 : 0;
}
