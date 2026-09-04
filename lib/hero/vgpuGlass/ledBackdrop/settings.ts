import type { Theme } from "@/components/theme/ThemeProvider";

import { HERO_GLASS_HULL_STRETCH } from "../hullShape";

export interface RenderSize {
  width: number;
  height: number;
}

export const LEDS_PER_EDGE = 24;
export const TRIANGLE_HEIGHT_RATIO = (180 / 630) * 0.8 * 1.18;
export const HERO_CANVAS_MAX_CSS = 720;
const MIN_SIM_HEIGHT = 360;
const LED_RADIUS_TO_TRIANGLE_HEIGHT = 0.0236;
const LED_NORMAL_HALF_THICKNESS_TO_RADIUS = 2;
const LED_TANGENT_GAP_PX = 1;
const LED_CORNER_TRIM_EPSILON_PX = 1;
const LED_MESH_INSET_PX = 5;

export const LED_SDF_CROP_EXPANSION_PX = 2;
export const LED_EMITTER_MESH_EXPANSION_PX = 1;
export const NOISE_ROTATION_START_SECONDS = 10;
export const BRIGHTNESS_MIN_HOVER_MULTIPLIER = 4;
export const BRIGHTNESS_MIN_HOVER_SMOOTHING = 0.2;

export const HERO_STATE_MODES = {
  edge: 'edge',
  lines: 'lines',
} as const;
export type HeroStateMode =
  (typeof HERO_STATE_MODES)[keyof typeof HERO_STATE_MODES];

export interface HeroStateSettings {
  mode: HeroStateMode;
  transitionDuration: number;
  edgeIndex: number;
  edgeHighlightBrightness: number;
}

export const HERO_STATE_DEFAULTS: HeroStateSettings = {
  mode: HERO_STATE_MODES.lines,
  transitionDuration: 0.25,
  edgeIndex: 0,
  edgeHighlightBrightness: 0.4,
};

export interface BrushSettings {
  glowEnabled?: boolean;
  glowRadius?: number;
  glowStrength?: number;
  glowSmoothing?: number;
  glowFacingEnabled?: boolean;
  glowFacingFullDeg?: number;
  glowFacingZeroDeg?: number;
  linesFadeDistance?: number;
}

export interface BrushState extends BrushSettings {
  x: number;
  y: number;
  active: boolean;
  inside?: boolean;
  isMouse?: boolean;
}

export interface SceneTunables {
  ledIntensity: number;
  brightnessMin: number;
  brightnessMinDark: number;
  brightnessMax: number;
}

export const DEFAULT_BRUSH: BrushSettings = {
  glowEnabled: true,
  glowRadius: 165,
  glowStrength: 1,
  glowSmoothing: 0.23,
  glowFacingEnabled: true,
  glowFacingFullDeg: 90,
  glowFacingZeroDeg: 100,
  linesFadeDistance: 0.6,
};

export const TUNABLE_DEFAULTS = {
  ledIntensity: 1,
  brightnessMin: 0.09,
  brightnessMinDark: 0.05,
  brightnessMax: 1,
} as const;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Per-edge linear RGB — light theme (green + pink). */
export const HERO_LED_EDGE_COLORS_LIGHT = [
  { r: 0.071, g: 0.730, b: 0.224 },
  { r: 1.0, g: 0.051, b: 0.439 },
  { r: 0.012, g: 0.515, b: 0.117 },
] as const satisfies readonly Rgb[];

/** Per-edge linear RGB — dark theme (blue + pink). */
export const HERO_LED_EDGE_COLORS_DARK = [
  { r: 0.122, g: 0.318, b: 0.980 },
  { r: 1.0, g: 0.051, b: 0.439 },
  { r: 0.033, g: 0.141, b: 0.922 },
] as const satisfies readonly Rgb[];

export const HERO_LED_EDGE_COLORS = HERO_LED_EDGE_COLORS_LIGHT;

let activeHeroLedEdgeColors: readonly Rgb[] = HERO_LED_EDGE_COLORS_DARK;

export function setHeroLedTheme(theme: Theme): void {
  activeHeroLedEdgeColors =
    theme === "light" ? HERO_LED_EDGE_COLORS_LIGHT : HERO_LED_EDGE_COLORS_DARK;
}

export function getHeroLedEdgeColor(index: number): Rgb {
  return activeHeroLedEdgeColors[
    Math.min(index, activeHeroLedEdgeColors.length - 1)
  ]!;
}

export interface HoverRgbTintSettings {
  enabled: boolean;
  amount: number;
  radius: number;
  power: number;
  responseSmoothing: number;
  edgeRedLinear: Rgb;
  edgeGreenLinear: Rgb;
  edgeBlueLinear: Rgb;
  edgeOverlap: number;
}

export const HOVER_RGB_TINT_DEFAULTS: HoverRgbTintSettings = {
  enabled: true,
  amount: 1,
  radius: 173,
  power: 3,
  responseSmoothing: 0.2,
  edgeRedLinear: { ...HERO_LED_EDGE_COLORS_LIGHT[0] },
  edgeGreenLinear: { ...HERO_LED_EDGE_COLORS_LIGHT[1] },
  edgeBlueLinear: { ...HERO_LED_EDGE_COLORS_LIGHT[2] },
  edgeOverlap: 1,
};

export function simulationFloorFactor(cssHeight: number) {
  return Math.max(1, MIN_SIM_HEIGHT / Math.max(1, cssHeight));
}

interface LedPosition {
  x: number;
  y: number;
  angle?: number;
  /**
   * Half the emitter quad length along its edge. Each edge of the stretched
   * triangle packs its LEDs from its own length, so this is per LED rather than
   * a single value on `TriangleLedShape`.
   */
  halfLength?: number;
}

export interface TriangleGeometry {
  center: LedPosition;
  top: LedPosition;
  left: LedPosition;
  right: LedPosition;
  height: number;
  circumradius: number;
  inradius: number;
  sideLength: number;
}

interface TriangleLedShape {
  normalHalfThickness: number;
  tangentHalfLength: number;
  cornerTrim: number;
  centerSpacing: number;
}

export interface TriangleLayout {
  center: LedPosition;
  positions: LedPosition[];
  geometry: TriangleGeometry;
  ledShape: TriangleLedShape;
}

let heroSceneScale = 1;

export function setHeroSceneScale(scale: number) {
  heroSceneScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function resolveHeroSceneScale(
  baseZoom: number,
  cssHeight: number,
  mobile = false,
) {
  if (mobile) return baseZoom;
  if (!Number.isFinite(cssHeight) || cssHeight <= 0) return baseZoom;
  return baseZoom * Math.min(1, 560 / cssHeight);
}

export function canonicalTriangleGeometry(size: RenderSize): TriangleGeometry {
  // This triangle is the backdrop stand-in for the glass hull silhouette, so it
  // takes the same non-uniform stretch as the mesh. Scaling about the centroid
  // preserves inradius === circumradius / 2, which is the relation both LED
  // shaders use to rebuild the corners from `cfg.triangle`, so neither shader
  // needs to change.
  const baseHeight = size.height * TRIANGLE_HEIGHT_RATIO * heroSceneScale;
  const height = baseHeight * HERO_GLASS_HULL_STRETCH.y;
  const circumradius = (height * 2) / 3;
  const inradius = height / 3;
  // `sideLength` is the base edge: the full width between `left` and `right`.
  // Once stretched it is no longer the length of the other two edges.
  const sideLength =
    ((baseHeight * 2) / Math.sqrt(3)) * HERO_GLASS_HULL_STRETCH.x;
  const cx = size.width * 0.5;
  // The hull is stretched about its base (the floor plane), not its centroid,
  // so anchor the backdrop triangle's base edge where the unstretched triangle
  // put it and let the apex rise. Shifting only the centre keeps
  // inradius === circumradius / 2, the relation both LED shaders use to rebuild
  // the corners from `cfg.triangle`.
  const cy =
    size.height * 0.5 - (baseHeight / 3) * (HERO_GLASS_HULL_STRETCH.y - 1);
  const center = { x: cx, y: cy };
  const top = { x: cx, y: cy - circumradius };
  const left = { x: cx - sideLength * 0.5, y: cy + inradius };
  const right = { x: cx + sideLength * 0.5, y: cy + inradius };
  return {
    center,
    top,
    left,
    right,
    height,
    circumradius,
    inradius,
    sideLength,
  };
}

function triangleLedRadius(size: RenderSize) {
  return canonicalTriangleGeometry(size).height * LED_RADIUS_TO_TRIANGLE_HEIGHT;
}

function triangleLedNormalHalfThickness(size: RenderSize) {
  return triangleLedRadius(size) * LED_NORMAL_HALF_THICKNESS_TO_RADIUS;
}

function triangleLedCornerTrim(size: RenderSize) {
  const rawTrim =
    triangleLedNormalHalfThickness(size) * Math.sqrt(3) +
    LED_CORNER_TRIM_EPSILON_PX;
  const sideLength = canonicalTriangleGeometry(size).sideLength;
  return Math.min(rawTrim, sideLength * 0.45);
}

function triangleLedShapeDimensions(
  size: RenderSize,
  perEdge: number,
): TriangleLedShape {
  const geometry = canonicalTriangleGeometry(size);
  const cornerTrim = triangleLedCornerTrim(size);
  const trimmedSideLength = Math.max(0, geometry.sideLength - cornerTrim * 2);
  const centerSpacing = trimmedSideLength / Math.max(1, perEdge);
  const normalHalfThickness = triangleLedNormalHalfThickness(size);
  const tangentHalfLength = Math.max(
    0,
    centerSpacing * 0.5 - LED_TANGENT_GAP_PX * 0.5,
  );
  return {
    normalHalfThickness,
    tangentHalfLength,
    cornerTrim,
    centerSpacing,
  };
}

function scaleTriangleGeometry(
  geometry: TriangleGeometry,
  scale: number,
): TriangleGeometry {
  const center = geometry.center;
  const toward = (point: LedPosition) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  });
  return {
    center,
    top: toward(geometry.top),
    left: toward(geometry.left),
    right: toward(geometry.right),
    height: geometry.height * scale,
    circumradius: geometry.circumradius * scale,
    inradius: geometry.inradius * scale,
    sideLength: geometry.sideLength * scale,
  };
}

function ledMeshScale(base: TriangleGeometry) {
  const refHeight = HERO_CANVAS_MAX_CSS * TRIANGLE_HEIGHT_RATIO;
  const inset =
    (LED_MESH_INSET_PX * Math.min(base.height, refHeight)) / refHeight;
  return base.inradius > inset ? (base.inradius - inset) / base.inradius : 1;
}

export function ledMeshGeometry(size: RenderSize) {
  const base = canonicalTriangleGeometry(size);
  return scaleTriangleGeometry(base, ledMeshScale(base));
}

export function triangleEdgeLedLayout(
  size: RenderSize,
  perEdge: number,
): TriangleLayout {
  const base = canonicalTriangleGeometry(size);
  const meshScale = ledMeshScale(base);
  const geometry = scaleTriangleGeometry(base, meshScale);
  const { top, left, right, center } = geometry;
  const edges = [
    [top, left],
    [left, right],
    [right, top],
  ] as const;
  const ledSize = { width: size.width, height: size.height * meshScale };
  const ledShape = triangleLedShapeDimensions(ledSize, perEdge);
  const positions: LedPosition[] = [];
  for (const [a, b] of edges) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const edgeLength = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    // The stretched triangle is no longer equilateral, so each edge is packed
    // from its own length instead of one shared spacing — otherwise the shorter
    // base edge overruns its corner while the longer sides fall short. On an
    // equilateral triangle edgeLength equals sideLength and this reduces to the
    // previous single global spacing.
    const trimmedEdgeLength = Math.max(0, edgeLength - ledShape.cornerTrim * 2);
    const centerSpacing = trimmedEdgeLength / Math.max(1, perEdge);
    const halfLength = Math.max(
      0,
      centerSpacing * 0.5 - LED_TANGENT_GAP_PX * 0.5,
    );
    const trimT = edgeLength > 0 ? ledShape.cornerTrim / edgeLength : 0;
    const slotT = edgeLength > 0 ? centerSpacing / edgeLength : 0;
    for (let i = 0; i < perEdge; i++) {
      const t = trimT + (i + 0.5) * slotT;
      positions.push({ x: a.x + dx * t, y: a.y + dy * t, angle, halfLength });
    }
  }
  return { center, positions, geometry, ledShape };
}
