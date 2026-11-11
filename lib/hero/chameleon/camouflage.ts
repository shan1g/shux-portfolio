// The chameleon's camouflage. Now and then, once it has stood still a moment, a wave runs from its snout to its tail
// and its skin takes on the page behind it, leaving a faint outline, the eyes and the green LEDs. It holds a few
// seconds and then shows again; walking breaks it at once.
// A few lines run after each material's own output (tone mapped, in sRGB): they tint it toward the page colour and
// fade the strip's alpha, so the page shows through the transparent canvas. The opaque parts still write depth with
// blending off, so only the nearest surface shows, never the far legs through the body.
import * as THREE from "three";
import type { Theme } from "@/components/theme/ThemeProvider";

type Range = readonly [min: number, max: number];

// The odds it blends each time it comes to rest, how long it stands first, and how long it holds.
const CHANCE = 0.6;
const DELAY_S: Range = [2, 4.5];
const HOLD_S: Range = [4, 8];
// How long the wave takes to run over it, to run back, and to break when it moves.
const IN_S = 1.8;
const OUT_S = 1.4;
const BREAK_S = 0.35;
// The page behind the strip: --background in app/styles/_theme.less.
const PAGE: Record<Theme, string> = { dark: "#0a0a0b", light: "#f8f8fa" };
// At full camouflage: how much of a part still shows (its alpha floor) and how far its colour turns to the page's.
// The armour all but goes; the eyes and the LEDs keep a hint of their own colour. A 0.55 turn on the armour left a
// pale porcelain ghost on the light page, so it turns almost all the way.
// On the light page the eyes keep about half the dark page's hint: at 0.35 the eye turret read as a grey UI icon next
// to the nav pill.
const PARTS = {
  body: { floor: { dark: 0.04, light: 0.04 }, tint: 0.9 },
  eyes: { floor: { dark: 0.35, light: 0.16 }, tint: 0.3 },
} as const;
export type CamoPart = keyof typeof PARTS;
// The faint outline the rim keeps at full camouflage; also lighter on the light page, where its grey reads more.
const RIM: Record<Theme, number> = { dark: 0.18, light: 0.1 };

const PARS = /* glsl */ `
uniform float uCamo;
uniform float uCamoX;
uniform float uCamoDir;
uniform vec3 uCamoTint;
uniform float uCamoFloor;
uniform float uCamoTintK;
uniform float uCamoRim;`;

// u runs from 0 at the snout to 1 at the tail (the walker's camera has no yaw, so view x is world x); k is the wave's
// share at this pixel, 0 untouched and 1 blended, with a ragged front. The rim keeps a faint outline, and the front
// glints the LEDs' green as it passes. Opaque parts write premultiplied colour straight to the canvas; the blended
// (see-through) ones only lose alpha.
const fragment = (half: number, blended: boolean) => /* glsl */ `
#include <dithering_fragment>
{
  float camoU = clamp(0.5 - 0.5 * uCamoDir * (-vViewPosition.x - uCamoX) / ${half.toFixed(3)}, 0.0, 1.0);
  float camoN = fract(sin(dot(floor(gl_FragCoord.xy / 3.0), vec2(12.9898, 78.233))) * 43758.5453);
  float camoK = clamp((uCamo * 1.9 - 0.15 - camoU - 0.2 * camoN) / 0.35, 0.0, 1.0);
  float camoRim = pow(1.0 - abs(normalize(normal).z), 3.0);
  float camoA = mix(1.0, min(1.0, uCamoFloor + uCamoRim * camoRim), camoK);
  vec3 camoRgb = mix(gl_FragColor.rgb, uCamoTint, uCamoTintK * camoK) + (1.0 - abs(2.0 * camoK - 1.0)) * vec3(0.05, 0.22, 0.09);
  gl_FragColor = ${blended ? "vec4(camoRgb, gl_FragColor.a * camoA)" : "vec4(camoRgb * camoA, gl_FragColor.a * camoA)"};
}`;

export interface Camouflage {
  /** Fades this material with the rest of the body, as an armour part or as part of the eyes and LEDs. */
  attach(material: THREE.Material, part: CamoPart): void;
  /** Advances one frame. busy: it is walking or turning. rested: it has walked in, so it may blend. */
  update(dt: number, busy: boolean, rested: boolean): void;
  /** Where the body is, for the wave: its middle (world x) and the way the snout points (the cosine of its yaw). */
  place(x: number, dir: number): void;
  setTheme(theme: Theme): void;
  /** 0 shown, 1 blended in. */
  readonly amount: number;
  /** Still fading, or due to blend in or show again: the walker must keep drawing. */
  readonly pending: boolean;
}

/** half: half the body's length round its middle, so the wave runs from the snout to the tail's spiral. */
export function createCamouflage(canvas: HTMLCanvasElement, theme: Theme, half: number): Camouflage {
  // Shared by every material, so one update moves them all.
  const uniforms = {
    uCamo: { value: 0 },
    uCamoX: { value: 0 },
    uCamoDir: { value: -1 },
    uCamoTint: { value: new THREE.Vector3() },
    uCamoRim: { value: RIM[theme] },
  };
  // Each part's alpha floor, shared by its materials so a theme change moves them all.
  const floors: Record<CamoPart, { value: number }> = { body: { value: 0 }, eyes: { value: 0 } };
  let amount = 0;
  let goal = 0;
  // Seconds standing still this time, whether this rest has had its roll of the dice, and when (in rest seconds) it
  // blends in and shows again.
  let rest = 0;
  let rolled = false;
  let blendAt = Infinity;
  let showAt = Infinity;
  const between = ([a, b]: Range) => a + (b - a) * Math.random();

  const setTheme = (next: Theme) => {
    const n = Number.parseInt(PAGE[next].slice(1), 16);
    uniforms.uCamoTint.value.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    uniforms.uCamoRim.value = RIM[next];
    for (const part of Object.keys(PARTS) as CamoPart[]) floors[part].value = PARTS[part].floor[next];
  };
  setTheme(theme);

  return {
    attach(material, part) {
      const { tint } = PARTS[part];
      const blended = material.transparent;
      const previous = material.onBeforeCompile.bind(material);
      const key = `${material.customProgramCacheKey()}|cham-camo-${blended ? "b" : "o"}`;
      material.onBeforeCompile = (shader, renderer) => {
        previous(shader, renderer);
        Object.assign(shader.uniforms, uniforms, { uCamoFloor: floors[part], uCamoTintK: { value: tint } });
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", `#include <common>${PARS}`)
          .replace("#include <dithering_fragment>", fragment(half, blended));
      };
      material.customProgramCacheKey = () => key;
    },
    update(dt, busy, rested) {
      if (busy) {
        rest = 0;
        rolled = false;
        blendAt = Infinity;
        showAt = Infinity;
        goal = 0;
      } else if (rested) {
        rest += dt;
        if (!rolled) {
          rolled = true;
          if (Math.random() < CHANCE) {
            blendAt = between(DELAY_S);
            showAt = blendAt + IN_S + between(HOLD_S);
          }
        }
        goal = rest >= blendAt && rest < showAt ? 1 : 0;
      }
      const rate = goal > amount ? 1 / IN_S : 1 / (busy ? BREAK_S : OUT_S);
      amount = goal > amount ? Math.min(goal, amount + rate * dt) : Math.max(goal, amount - rate * dt);
      uniforms.uCamo.value = amount * amount * (3 - 2 * amount);
      const state = goal ? "on" : "off";
      if (canvas.dataset.camo !== state) canvas.dataset.camo = state;
    },
    place(x, dir) {
      uniforms.uCamoX.value = x;
      uniforms.uCamoDir.value = dir;
    },
    setTheme,
    get amount() {
      return amount;
    },
    get pending() {
      return amount !== goal || (showAt !== Infinity && rest < showAt);
    },
  };
}
