/**
 * Non-uniform stretch applied to the outer glass hull
 * (`/hero/glass-fractal/rounded-tetrahedron.mesh`) so it reads as a tall gem
 * rather than the beveled tetrahedron of the vgpu glass-fractal example.
 *
 * The hull is a pre-baked binary mesh, so the silhouette is changed by
 * deforming it rather than by authoring a new asset. Every consumer of the
 * silhouette derives from this one constant:
 * - `hero-glass.wgsl` / `hero-glass-transmission.wgsl` deform the vertices and
 *   map the analytic refraction hull back into unstretched mesh space.
 * - `scene.ts` narrows the glass floor-AO footprint.
 * - `ledBackdrop/settings.ts` stretches the backdrop occluder triangle.
 *
 * WGSL cannot import a TypeScript value, so the two glass shaders repeat these
 * numbers as module consts. Keep them in sync with this file.
 */
export const HERO_GLASS_HULL_STRETCH = {
  x: 0.82,
  y: 1.34,
  z: 0.82,
} as const;

/**
 * The floor plane, matching `HERO_FLOOR_Y` in
 * `hero-fractal-background-draw.wgsl` and `hero-fractal-floor-ao.wgsl`. The
 * vertical stretch is applied about this plane so the hull base stays seated on
 * the floor instead of sinking through it.
 */
export const HERO_GLASS_HULL_BASE_Y = -0.33333333333;
