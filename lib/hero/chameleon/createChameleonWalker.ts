// The small robotic chameleon at the bottom of the screen: the cutaway chameleon (cutaway-ref/chameleon, round 5)
// seen side-on through a flat camera, a fraction of the size. Once the page has loaded it walks in from the nearer
// edge of the screen to where scroll wants it. From then on scroll says where along the screen it should be; the loop
// walks it there on a diagonal trot (left front with right hind, then right front with left hind), and it turns to
// face the way it is walking after a short step backwards. Its eyes swivel on their own and its tail sways. Now and
// then, standing still, it blends into the page behind it for a few seconds (camouflage.ts).
import * as THREE from "three";
import type { Theme } from "@/components/theme/ThemeProvider";
import { buildChameleon, FLOOR_Y, legHome } from "./chameleon.js";
import { createCamouflage } from "./camouflage";

/** A box on screen, in client pixels (a DOMRect will do). */
export type ScreenBox = Pick<DOMRectReadOnly, "left" | "right" | "top" | "bottom">;

export interface ChameleonWalkerRenderer {
  /** Resolves once the shaders are compiled. Nothing shows until enter(). */
  readonly ready: Promise<void>;
  /** Walk in from the nearer edge of the screen to where scroll wants it. Only the first call counts. */
  enter(): void;
  /**
   * Walk off the nearer edge of the screen and stop drawing. Resolves once it is wholly off screen, or at once if it
   * never walked in. Only the first call counts.
   */
  leave(): Promise<void>;
  /**
   * Where along the screen it should be: 0 the left end of its track, 1 the right end. On phones the strip climbs the
   * left edge of the screen, and 0 is the top, 1 the bottom.
   */
  setPosition(value: number, immediate?: boolean): void;
  /**
   * The track position nearest `preferred` at which its whole body stands clear of the given boxes (only those over
   * its strip count), so it does not come to rest behind them. The nearer end of the track when nowhere is clear.
   */
  clearPosition(preferred: number, avoid: readonly ScreenBox[]): number;
  applyTheme(theme: Theme): void;
  dispose(): void;
}

export interface ChameleonWalkerOptions {
  canvas: HTMLCanvasElement;
  theme: Theme;
}

type Vec3 = [number, number, number];
type Card = [width: number, height: number, dir: Vec3, color: string, strength: number];
type Band = [color: string, strength: number, height: number, y: number];
type Dome = [top: string, horizon: string, bottom: string, strength: number];

const MAX_PIXEL_RATIO = 1.5;
// The camera: how many world units of height the strip shows, and a slight downward look so the far legs read
// above the near ones.
const VIEW_H = 1.9;
const CAM_EL = 0.16;
const CAM_DIST = 20;
// How far out the near feet reach (z), and the clear floor kept under them.
const FOOT_Z = 0.55;
const FLOOR_MARGIN = 0.06;
// The middle of the body (body frame x): the snout is at 1.3 and the tail's spiral ends near -2. It turns round
// this point, and the track places it.
const MID_X = -0.35;
// A little over half the body's length: its track stops this far in from either edge, so the snout and the spiral
// stay on screen at the ends. It starts its walk in this far past the edge, wholly off screen.
const EDGE = 1.9;
const OFFSTAGE = 2.1;
// Half the body's length round its middle (the snout 1.65 in front, the tail's spiral about 1.55 behind): the
// camouflage's wave runs over this, and clearPosition keeps it, plus CLEAR_MARGIN, clear of what it avoids.
const BODY_HALF = 1.65;
const CLEAR_MARGIN = 0.1;
// The gait: how far a planted foot travels per step (body units; the legs reach about 0.86 from the hip), the share
// of a step each foot is down, the swing's lift and the body's bob.
const STRIDE = 0.36;
const DUTY = 0.5;
const LIFT = 0.1;
const BOB = 0.015;
// Diagonal pairs (legs LF, LH, RF, RH): LF with RH, then LH with RF. The small offsets stop each pair landing as one.
const LEG_PHASE = [0, 0.52, 0.5, 0.03];
// How quickly it closes on where scroll wants it (per second), and its top speed (body units per second). The
// walk in is the same walk, at the top speed.
const FOLLOW_RATE = 4;
const MAX_SPEED = 3;
// How far it walks backwards before it turns round, and how fast it turns.
const TURN_AFTER = 0.12;
const TURN_RATE = 4;
// Standing still it idles at 30fps (the eyes and the tail), then holds a still after a few seconds until scroll
// moves it again.
const IDLE_FRAME_MS = 1000 / 30;
const IDLE_SLEEP_S = 4;
const SHADOW_OPACITY: Record<Theme, number> = { dark: 0.55, light: 0.22 };
const EXPOSURE: Record<Theme, number> = { dark: 0.95, light: 1.15 };

const frac = (v: number) => v - Math.floor(v);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function canvasTexture(
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D, width: number, height: number) => void,
): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = width;
  cv.height = height;
  const g = cv.getContext("2d");
  if (g) draw(g, width, height);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function verticalGradient(stops: [number, string][]): THREE.CanvasTexture {
  return canvasTexture(4, 256, (g, w, h) => {
    const lin = g.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of stops) lin.addColorStop(at, color);
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
  });
}

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m);
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) {
    for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
    m.dispose();
  }
}

// Glowing cards round a dark void, prefiltered for the armour (or the lenses) to reflect, with an optional soft ring
// round the horizon and a studio dome (the cutaway stage's function).
function cardEnvironment(
  renderer: THREE.WebGLRenderer,
  background: string,
  cards: Card[],
  sigma: number,
  band?: Band,
  dome?: Dome,
): THREE.Texture {
  const env = new THREE.Scene();
  env.background = new THREE.Color(background);
  if (dome) {
    const [top, mid, bottom, k] = dome;
    const map = verticalGradient([
      [0, top],
      [0.44, mid],
      [0.56, mid],
      [1, bottom],
    ]);
    env.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(19, 48, 24),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), map, side: THREE.BackSide }),
      ),
    );
  }
  if (band) {
    const [color, k, h, y] = band;
    const map = verticalGradient([
      [0, "#000"],
      [0.5, "#fff"],
      [1, "#000"],
    ]);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 17, h, 64, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), map, side: THREE.BackSide }),
    );
    ring.position.y = y;
    env.add(ring);
  }
  for (const [w, h, dir, color, k] of cards) {
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    card.position.copy(new THREE.Vector3(...dir).normalize().multiplyScalar(15));
    card.lookAt(0, 0, 0);
    env.add(card);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, sigma).texture;
  pmrem.dispose();
  disposeTree(env);
  return texture;
}

// What the armour and the lenses reflect: the cutaway stage's values (round 5).
function chameleonEnvironments(renderer: THREE.WebGLRenderer) {
  const environment = cardEnvironment(
    renderer,
    "#060607",
    [
      [18, 10, [0.1, 1, 0.15], "#fff6ee", 2.7],
      [6, 4, [0.8, 0.45, 0.35], "#ffffff", 2.6],
      [4, 10, [0.55, 0.2, -0.8], "#d8dce2", 2.4],
      [4, 9, [0.35, 0.35, 0.87], "#e8e8ec", 1.8],
      [14, 0.9, [-0.95, 0.16, 0.05], "#ffb070", 6],
      [1.6, 12, [-0.3, 0.25, 0.9], "#ff4a9a", 2.2],
      [14, 1.6, [0.4, -0.5, 0], "#ff4a14", 1.0],
      [16, 5, [-0.62, 0.62, -0.45], "#ff7a48", 1.4],
    ],
    0.02,
    ["#c9ccd2", 1.3, 14, 1.5],
    ["#d4d6da", "#7a7d82", "#141416", 1.0],
  );
  // A cool world for the lenses, so they read blue-black with one white window.
  const lensEnvironment = cardEnvironment(
    renderer,
    "#050303",
    [
      [10, 6, [-0.2, 1, 0.2], "#8fb0c8", 1.6],
      [1.6, 12, [-0.85, 0.3, 0.45], "#5a7890", 0.8],
      [3.2, 2.2, [0.42, 0.62, 0.66], "#eef6ff", 4],
    ],
    0.01,
  );
  return { environment, lensEnvironment };
}

// A transmissive glass as plain see-through glass: no second render of the scene. Fully transmissive glass shows
// little of its own colour, so the clone is about as faint as it was clear; the reflections and clearcoat carry it.
// The lens glass shades from its environment only (a shader hook on the instance), which clone() does not copy.
function toSeeThrough(material: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  const clone = material.clone();
  clone.opacity = (material.transparent ? material.opacity : 1) * (1 - 0.8 * material.transmission);
  clone.transmission = 0;
  clone.transparent = true;
  clone.depthWrite = false;
  clone.onBeforeCompile = material.onBeforeCompile;
  clone.customProgramCacheKey = material.customProgramCacheKey;
  return clone;
}

export function createChameleonWalker({ canvas, theme }: ChameleonWalkerOptions): ChameleonWalkerRenderer {
  // Throws when WebGL is unavailable; the caller leaves the strip empty.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const { environment, lensEnvironment } = chameleonEnvironments(renderer);
  scene.environment = environment;

  // The cutaway stage's lights without its shadow map, floor or bloom: at this size a soft contact shadow reads
  // better. The front fill is a little stronger, so the dark armour does not read as a flat silhouette.
  const key = new THREE.DirectionalLight("#ffa860", 4.0);
  key.position.set(-5, 7, 1.5);
  const rose = new THREE.DirectionalLight("#d86aa0", 1.1);
  rose.position.set(1.5, 4.5, -5);
  const front = new THREE.DirectionalLight("#c8b8c0", 1.0);
  front.position.set(6, 3, 3);
  scene.add(key, rose, front, new THREE.HemisphereLight("#24202a", "#050405", 0.5));

  const chameleon = buildChameleon();
  for (const material of [chameleon.M.lens, chameleon.M.lensGlass]) {
    material.envMap = lensEnvironment;
    material.needsUpdate = true;
  }
  // Any transmissive material makes three.js draw the whole scene a second time, into a render target, every frame.
  // At this size the lens glass's refraction does not show, so its meshes get a see-through clone instead.
  const seeThrough = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
  chameleon.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const material = mesh.material as THREE.MeshPhysicalMaterial;
    if (!material.isMeshPhysicalMaterial || !(material.transmission > 0)) return;
    let clone = seeThrough.get(material);
    if (!clone) {
      clone = toSeeThrough(material);
      seeThrough.set(material, clone);
    }
    mesh.material = clone;
  });
  scene.add(chameleon.root);

  // Now and then it blends into the page (camouflage.ts). The eyes and the LEDs keep a hint; the rest all but goes.
  const camo = createCamouflage(canvas, theme, BODY_HALF);
  const eyeMaterials = new Set<THREE.Material>([
    chameleon.M.lens,
    chameleon.M.iris,
    chameleon.M.led,
    ...seeThrough.values(),
  ]);
  const camouflaged = new Set<THREE.Material>();
  chameleon.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (camouflaged.has(m)) continue;
      camouflaged.add(m);
      camo.attach(m, eyeMaterials.has(m) ? "eyes" : "body");
    }
  });

  // A soft shadow under the body, so it stands on the bottom of the screen rather than floating over it.
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: canvasTexture(256, 256, (g, w, h) => {
      const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      rg.addColorStop(0, "rgba(0,0,0,1)");
      rg.addColorStop(0.55, "rgba(0,0,0,0.45)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    }),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4).rotateX(-Math.PI / 2), shadowMaterial);
  chameleon.root.add(shadow);

  // Side-on from the chameleon's right (+z), looking a touch down. The look point is set so the near feet land just
  // above the strip's bottom edge.
  const camera = new THREE.OrthographicCamera(-1, 1, VIEW_H / 2, -VIEW_H / 2, 0.1, 60);
  const lookY = FLOOR_Y + (VIEW_H / 2 - FLOOR_MARGIN - FOOT_Z * Math.sin(CAM_EL)) / Math.cos(CAM_EL);
  camera.position.set(0, lookY + CAM_DIST * Math.sin(CAM_EL), CAM_DIST * Math.cos(CAM_EL));
  camera.lookAt(0, lookY, 0);
  camera.updateMatrixWorld();
  let viewW = VIEW_H * 10;

  let started = false;
  // It has walked in: from then on a refresh may snap it to its spot.
  let arrived = false;
  let position = 0;
  let x = 0;
  let facing = -1;
  let yaw = Math.PI;
  let phase = 0;
  let gait = 0;
  let reverse = 0;
  let idleFor = 0;
  let elapsed = 0;
  let last = 0;
  let lastDraw = 0;
  let shadowStrength = SHADOW_OPACITY[theme];
  let pageVisible = document.visibilityState !== "hidden";
  let isReady = false;
  let disposed = false;
  let frame = 0;
  // Walking off: where it is headed (the nearer edge, wholly off screen), and gone once it is there.
  let exitX: number | null = null;
  let gone = false;
  let leaving: Promise<void> | null = null;
  let resolveLeave: (() => void) | null = null;

  const finishLeave = () => {
    gone = true;
    canvas.style.visibility = "hidden";
    resolveLeave?.();
    resolveLeave = null;
  };

  const trackX = () => {
    const half = Math.max(0, viewW / 2 - EDGE);
    return half * (2 * position - 1);
  };

  const feet = Array.from({ length: 4 }, () => [0, 0, 0]);

  const draw = () => {
    const bob = BOB * gait * (0.5 - 0.5 * Math.cos(4 * Math.PI * phase));
    for (let i = 0; i < 4; i++) {
      const home = legHome(i);
      const p = frac(phase + LEG_PHASE[i]);
      let ahead: number;
      let lift: number;
      if (p < DUTY) {
        // planted: the foot slides back under the body as the body moves forward
        ahead = STRIDE * (0.5 - p / DUTY);
        lift = 0;
      } else {
        // swinging: lifted and carried forward to the next spot
        const u = (p - DUTY) / (1 - DUTY);
        ahead = STRIDE * (u * u * (3 - 2 * u) - 0.5);
        lift = LIFT * Math.sin(Math.PI * u);
      }
      const foot = feet[i];
      foot[0] = home[0] + ahead * gait;
      // the body bobs down, so the feet rise in its frame by the same amount to stay on the floor
      foot[1] = home[1] + bob + lift * gait;
      foot[2] = home[2];
    }
    // It turns round the middle of its body, which stays on its spot along the track.
    chameleon.root.rotation.y = yaw;
    chameleon.root.position.set(x - MID_X * Math.cos(yaw), -bob, MID_X * Math.sin(yaw));
    shadow.position.set(MID_X, FLOOR_Y + 0.003 + bob, 0);
    // Blended in, its shadow all but goes too.
    shadowMaterial.opacity = shadowStrength * (1 - 0.75 * camo.amount);
    camo.place(x, Math.cos(yaw));
    // The tail uncurls a touch while it walks and breathes slowly while it stands.
    const curl = 1 - 0.06 * gait + 0.03 * Math.sin(elapsed * 0.8);
    chameleon.pose({ t: elapsed, spinT: elapsed, feet, curl });
    renderer.render(scene, camera);
  };

  // Advances one frame. Returns whether anything is still moving.
  const step = (dt: number) => {
    elapsed += dt;
    const target = exitX ?? trackX();
    const maxStep = MAX_SPEED * dt;
    // Walking off it keeps its top speed all the way out, rather than easing in to the edge.
    const pull = exitX === null ? (target - x) * (1 - Math.exp(-FOLLOW_RATE * dt)) : target - x;
    const dx = clamp(pull, -maxStep, maxStep);
    x += dx;
    if (exitX === null && !arrived && Math.abs(target - x) < 0.05) arrived = true;
    if (exitX !== null && !gone && Math.abs(exitX - x) < 1e-6) finishLeave();

    // The gait runs on the distance walked in the direction it faces, so walking backwards steps backwards.
    const forward = dx * facing;
    phase += (forward * DUTY) / STRIDE;
    if (forward < 0) {
      reverse -= forward;
      if (reverse > TURN_AFTER) {
        facing = -facing;
        reverse = 0;
      }
    } else {
      reverse = Math.max(0, reverse - forward);
    }

    const moving = dt > 0 && Math.abs(dx) / dt > 0.05;
    gait += ((moving ? 1 : 0) - gait) * (1 - Math.exp(-(moving ? 10 : 4) * dt));

    const yawTarget = facing > 0 ? 0 : Math.PI;
    yaw += (yawTarget - yaw) * (1 - Math.exp(-TURN_RATE * dt));
    if (Math.abs(yawTarget - yaw) < 1e-3) yaw = yawTarget;

    const busy = moving || yaw !== yawTarget || gait > 0.01;
    idleFor = busy ? 0 : idleFor + dt;
    camo.update(dt, busy, arrived);
    return busy;
  };

  const shouldRun = () => isReady && !disposed && pageVisible && started && !gone;

  const loop = (now: number) => {
    frame = 0;
    if (!shouldRun()) {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const busy = step(dt);
    if (busy || !lastDraw || now - lastDraw >= IDLE_FRAME_MS) {
      draw();
      lastDraw = now;
    }
    // Standing still for a while: hold the last frame until scroll moves it (once any camouflage has played out).
    if (idleFor > IDLE_SLEEP_S && !camo.pending) {
      last = 0;
      return;
    }
    frame = requestAnimationFrame(loop);
  };

  const wake = () => {
    if (frame || !shouldRun()) return;
    idleFor = 0;
    last = 0;
    lastDraw = 0;
    frame = requestAnimationFrame(loop);
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    viewW = VIEW_H * (width / height);
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.updateProjectionMatrix();
    // A resize moves the track's ends; once it has walked in, jump there rather than walk.
    if (arrived && exitX === null) x = trackX();
    if (isReady && !disposed && started && !gone) draw();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const onVisibility = () => {
    pageVisible = document.visibilityState !== "hidden";
    wake();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const applyTheme = (next: Theme) => {
    renderer.toneMappingExposure = EXPOSURE[next];
    shadowStrength = SHADOW_OPACITY[next];
    camo.setTheme(next);
    if (isReady && !disposed && started && !gone) draw();
  };
  applyTheme(theme);

  const ready = (async () => {
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      // The first draw compiles instead.
    }
    if (disposed) return;
    // compileAsync links the programs, but each one's uniforms are looked up on its first draw. Draw once now,
    // while the canvas is still hidden, so the walk in's first frame does not pay it.
    try {
      draw();
    } catch {
      // The walk in's first frame tries again.
    }
    isReady = true;
    wake();
  })();

  return {
    ready,
    enter() {
      if (started || disposed) return;
      started = true;
      // From the nearer edge, wholly off screen, facing in; it walks to its spot at its top speed.
      const side = trackX() >= 0 ? 1 : -1;
      x = side * (viewW / 2 + OFFSTAGE);
      facing = -side;
      yaw = facing > 0 ? 0 : Math.PI;
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      wake();
    },
    leave() {
      if (!leaving) {
        leaving = new Promise<void>((resolve) => {
          resolveLeave = resolve;
        });
        if (!started || disposed) {
          finishLeave();
        } else {
          // To the nearer edge, wholly off screen; scroll no longer moves it.
          exitX = (x >= 0 ? 1 : -1) * (viewW / 2 + OFFSTAGE);
          wake();
        }
      }
      return leaving;
    },
    setPosition(value, immediate = false) {
      position = Math.min(1, Math.max(0, value));
      // A refresh snaps it to its spot, but never cuts its walk in or its walk off short.
      if (immediate && exitX === null && (arrived || !started)) x = trackX();
      wake();
    },
    clearPosition(preferred, avoid) {
      const want01 = clamp(preferred, 0, 1);
      const strip = canvas.getBoundingClientRect();
      const half = Math.max(0, viewW / 2 - EDGE);
      if (!strip.width || !strip.height || !half) return want01;
      // On phones the strip climbs the left edge (_hero.less turns the canvas a quarter clockwise; its layout size is
      // unchanged), so the track runs down the screen instead of across it.
      const climbing = strip.height > strip.width && canvas.clientWidth > canvas.clientHeight;
      // Client pixels to world x along the track, and how far either side of its middle must stay clear.
      const unit = (climbing ? strip.width : strip.height) / VIEW_H;
      const centre = climbing ? strip.top + strip.height / 2 : strip.left + strip.width / 2;
      const reach = BODY_HALF + CLEAR_MARGIN;
      const blocked = avoid
        .filter((b) =>
          climbing
            ? b.bottom > b.top && b.right > strip.left && b.left < strip.right
            : b.right > b.left && b.bottom > strip.top && b.top < strip.bottom,
        )
        .map((b): [number, number] => {
          const [lo, hi] = climbing ? [b.top, b.bottom] : [b.left, b.right];
          return [(lo - centre) / unit - reach, (hi - centre) / unit + reach];
        });
      const want = half * (2 * want01 - 1);
      const free = (v: number) =>
        v >= -half - 1e-6 && v <= half + 1e-6 && blocked.every(([a, b]) => v <= a + 1e-6 || v >= b - 1e-6);
      // The preferred spot, or the nearest edge of whatever blocks it; a tie goes right.
      let best: number | null = null;
      for (const v of [want, ...blocked.flat()]) {
        if (!free(v)) continue;
        const d = Math.abs(v - want);
        const bestD = best === null ? Infinity : Math.abs(best - want);
        if (d < bestD - 1e-6 || (Math.abs(d - bestD) <= 1e-6 && best !== null && v > best)) best = v;
      }
      if (best === null) return want01 < 0.5 ? 0 : 1;
      return clamp((best / half + 1) / 2, 0, 1);
    },
    applyTheme,
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resolveLeave?.();
      resolveLeave = null;
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      disposeTree(scene);
      environment.dispose();
      lensEnvironment.dispose();
      renderer.dispose();
    },
  };
}
