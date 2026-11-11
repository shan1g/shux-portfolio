// The small chrome spider at the bottom of the screen: the chrome spider seen side-on through a flat camera, a
// fraction of the size. Once the page has loaded it lets itself down from the top of the screen on a single thread.
// The strip it is drawn in slides down from above the screen with a thin CSS thread above it, while the legs are
// drawn in and paddle and the body turns a little on the line. It brakes and bobs on the thread just above the
// floor, unfolds its legs onto it, and the thread whips away upward. From then on scroll says where along the screen
// it should be; the loop walks it there on an alternating four-and-four gait (one set of feet planted while the body
// moves, the other stepping forward), and it turns to face the way it is walking after a short step backwards.
import * as THREE from "three";
import type { Theme } from "@/components/theme/ThemeProvider";
import {
  canvasTexture,
  disposeTree,
  LOOKS,
  spiderEnvironments,
} from "./createChromeSpiderRenderer";
import { buildSpider, FLOOR_Y, legHome, legTuck } from "./spider.js";

export interface SpiderWalkerRenderer {
  /** Resolves once the shaders are compiled. Nothing shows until drop(). */
  readonly ready: Promise<void>;
  /** Let it down from the top of the screen on its thread; it walks once it lands. Only the first call counts. */
  drop(): void;
  /** Where along the screen it should be: 0 the left end of its track, 1 the right end. */
  setPosition(value: number, immediate?: boolean): void;
  applyTheme(theme: Theme): void;
  dispose(): void;
}

export interface SpiderWalkerOptions {
  canvas: HTMLCanvasElement;
  /** The thread it comes down on: a thin element behind the canvas, moved and faded from here. */
  thread?: HTMLElement | null;
  theme: Theme;
}

const MAX_PIXEL_RATIO = 1.5;
// The camera: how many world units of height the strip shows, and a slight downward look so the far legs read
// above the near ones.
const VIEW_H = 2.6;
const CAM_EL = 0.16;
const CAM_DIST = 20;
// How far out the near feet reach (z), and the clear floor kept under them.
const FOOT_Z = 2.5;
const FLOOR_MARGIN = 0.08;
// A little over half the spider's length: its track stops this far in from either edge.
const EDGE = 2.4;
// The gait: how far a planted foot travels per step (body units), the share of a step each foot is down, the
// swing's lift and the body's bob.
const STRIDE = 0.55;
const DUTY = 0.56;
const LIFT = 0.2;
const BOB = 0.03;
// Alternating tetrapod: L1 R2 L3 R4 step together, then R1 L2 R3 L4 (legs 0-3 left, 4-7 right). The small offsets
// stop each set of four landing as one.
const LEG_PHASE = [0, 0.5, 0.04, 0.54, 0.5, 0.02, 0.54, 0.06];
// How quickly it closes on where scroll wants it (per second), and its top speed (body units per second).
const FOLLOW_RATE = 5;
const MAX_SPEED = 4;
// How far it walks backwards before it turns round (short, so it turns as soon as it reaches an end of the screen
// or scroll reverses), and how fast it turns.
const TURN_AFTER = 0.15;
const TURN_RATE = 5;
// The drop, in seconds: the fall from above the screen (braking as it nears the bottom, with a little give in the
// thread), a short hang just above the floor, the last stretch down as the legs unfold onto the floor, and the
// thread whipping away once it stands. It can start walking as the thread goes.
const FALL_S = 2.1;
const HANG_S = 0.5;
const LAND_S = 0.7;
const SNAP_S = 0.5;
const LAND_AT = FALL_S + HANG_S;
const SNAP_AT = LAND_AT + LAND_S;
const DROP_END = SNAP_AT + SNAP_S;
// Where it hangs before it lands, and how far the thread gives under it, as shares of the strip's height.
const HOVER = 0.32;
const GIVE = 0.14;
// How far it turns on the thread on the way down (radians), and how much the drawn-in legs paddle.
const TWIST = 0.45;
const PADDLE = 0.18;
// Where the thread meets the body: this far along the body (body frame, over the abdomen); the height is found on
// the shell.
const ATTACH_X = -1.1;
const THREAD_OPACITY = 0.55;
// Standing still it twitches at 30fps, then holds a still after a few seconds until scroll moves it again.
const IDLE_FRAME_MS = 1000 / 30;
const IDLE_SLEEP_S = 4;
const SHADOW_OPACITY: Record<Theme, number> = { dark: 0.55, light: 0.22 };

// A transmissive glass as plain see-through glass: no second render of the scene. Fully transmissive glass shows
// little of its own colour, so the clone is about as faint as it was clear; the reflections and clearcoat carry it.
function toSeeThrough(material: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  const clone = material.clone();
  clone.opacity = (material.transparent ? material.opacity : 1) * (1 - 0.8 * material.transmission);
  clone.transmission = 0;
  clone.transparent = true;
  clone.depthWrite = false;
  return clone;
}

const frac = (v: number) => v - Math.floor(v);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (k: number) => k * k * (3 - 2 * k);
const easeOut = (k: number) => 1 - (1 - k) ** 3;

export function createSpiderWalker({ canvas, thread = null, theme }: SpiderWalkerOptions): SpiderWalkerRenderer {
  // Throws when WebGL is unavailable; the caller leaves the strip empty.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const { environment, lensEnvironment } = spiderEnvironments(renderer);
  scene.environment = environment;

  // The hero's lights without its shadow map: at this size a soft contact shadow reads better.
  const key = new THREE.DirectionalLight("#ffa860", 4.0);
  key.position.set(-5, 7, 1.5);
  const rose = new THREE.DirectionalLight("#ff4aa0", 2.4);
  rose.position.set(1.5, 1.2, -5);
  const front = new THREE.DirectionalLight("#ff6ab0", 1.3);
  front.position.set(6, 3, 3);
  scene.add(key, rose, front, new THREE.HemisphereLight("#3a1430", "#050204", 0.5));

  const spider = buildSpider();
  for (const material of [spider.M.lens, spider.M.lensGlass]) {
    material.envMap = lensEnvironment;
    material.needsUpdate = true;
  }
  // At this size the glass's refraction barely shows, but any transmissive material makes three.js draw the whole
  // spider a second time, into a render target, every frame. The walker's meshes get see-through clones instead
  // (the lens glass keeps its environment); the shared materials, and the full-size spider, are untouched.
  const seeThrough = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
  spider.root.traverse((o) => {
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
  scene.add(spider.root);

  // Where the thread meets the body: straight down onto the shell at ATTACH_X on the middle line.
  const attach = new THREE.Vector3(ATTACH_X, 0.9, 0);
  spider.root.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(new THREE.Vector3(ATTACH_X, 10, 0), new THREE.Vector3(0, -1, 0))
    .intersectObject(spider.root, true)
    .find((h) => (h.object as THREE.Mesh).isMesh && h.object.visible);
  if (hit) attach.y = hit.point.y;

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
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.6).rotateX(-Math.PI / 2), shadowMaterial);
  spider.root.add(shadow);

  // Side-on from the spider's right (+z), looking a touch down. The look point is set so the near feet land just
  // above the strip's bottom edge.
  const camera = new THREE.OrthographicCamera(-1, 1, VIEW_H / 2, -VIEW_H / 2, 0.1, 60);
  const lookY = FLOOR_Y + (VIEW_H / 2 - FLOOR_MARGIN - FOOT_Z * Math.sin(CAM_EL)) / Math.cos(CAM_EL);
  camera.position.set(0, lookY + CAM_DIST * Math.sin(CAM_EL), CAM_DIST * Math.cos(CAM_EL));
  camera.lookAt(0, lookY, 0);
  camera.updateMatrixWorld();
  let viewW = VIEW_H * 10;
  let cssW = 0;
  let cssH = 0;

  let started = false;
  let dropT = 0;
  let position = 0;
  let x = 0;
  let facing = 1;
  let yaw = 0;
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

  const trackX = () => {
    const half = Math.max(0, viewW / 2 - EDGE);
    return half * (2 * position - 1);
  };

  // Where the drop has got to: the strip's offset from its place (px, negative is up), how far the legs are drawn
  // in, the turn on the thread, the floor shadow's share, and the thread's opacity share and lift (px).
  const drop = { offset: 0, tuck: 0, twist: 0, shadow: 1, thread: 0, lift: 0 };
  const updateDrop = () => {
    const fall = easeOut(clamp01(dropT / FALL_S));
    const land = smooth(clamp01((dropT - LAND_AT) / LAND_S));
    const snap = clamp01((dropT - SNAP_AT) / SNAP_S);
    // From just above the screen down to the hover point, plus a damped give in the thread as it brakes.
    const top = -window.innerHeight;
    let offset = top + (-cssH * HOVER - top) * fall;
    const s = dropT - FALL_S * 0.7;
    if (s > 0) offset += cssH * GIVE * Math.exp(-5 * s) * Math.sin(10 * s);
    drop.offset = offset * (1 - land);
    drop.tuck = 1 - land;
    drop.twist = TWIST * Math.sin(dropT * 1.9) * Math.exp(-0.8 * dropT) * (1 - land);
    drop.shadow = land * land;
    drop.thread = dropT < DROP_END ? 1 - snap : 0;
    drop.lift = snap * snap * window.innerHeight;
  };

  const feet = Array.from({ length: 8 }, () => [0, 0, 0]);
  const threadPoint = new THREE.Vector3();

  const draw = () => {
    updateDrop();
    const bob = BOB * gait * (0.5 - 0.5 * Math.cos(4 * Math.PI * phase));
    for (let i = 0; i < 8; i++) {
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
      if (drop.tuck > 0) {
        // hanging: the legs are drawn in and paddle a little, each on its own beat
        const tk = legTuck(i);
        const k = drop.tuck * (1 - PADDLE * (0.5 + 0.5 * Math.sin(elapsed * 7 + i * 1.9)));
        for (let j = 0; j < 3; j++) foot[j] += (tk[j] - foot[j]) * k;
      }
    }
    // Turning on the thread pivots round the thread, not the body's middle.
    const turn = yaw + drop.twist;
    spider.root.rotation.y = turn;
    spider.root.position.set(
      x + ATTACH_X * (Math.cos(yaw) - Math.cos(turn)),
      -bob,
      ATTACH_X * (Math.sin(turn) - Math.sin(yaw)),
    );
    shadow.position.set(-0.2, FLOOR_Y + 0.003 + bob, 0);
    shadowMaterial.opacity = shadowStrength * drop.shadow;
    spider.pose({ t: elapsed, spinT: elapsed, feet });
    renderer.render(scene, camera);

    // The strip and the thread move together, in the same frame as the render.
    canvas.style.transform = drop.offset ? `translate3d(0, ${drop.offset.toFixed(1)}px, 0)` : "";
    if (!thread) return;
    if (drop.thread > 0) {
      spider.root.updateMatrixWorld();
      threadPoint.copy(attach);
      spider.root.localToWorld(threadPoint);
      threadPoint.project(camera);
      const px = ((threadPoint.x + 1) / 2) * cssW - 0.5;
      const py = ((1 - threadPoint.y) / 2) * cssH + drop.offset - drop.lift;
      thread.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translateY(-100%)`;
      thread.style.opacity = String(THREAD_OPACITY * drop.thread);
      thread.style.visibility = "visible";
    } else {
      thread.style.visibility = "hidden";
    }
  };

  // Advances one frame. Returns whether anything is still moving.
  const step = (dt: number) => {
    elapsed += dt;
    const dropping = dropT < DROP_END;
    if (dropping) dropT = Math.min(DROP_END, dropT + dt);

    // It hangs where it came down until its feet are on the floor, then walks to where scroll wants it.
    let dx = 0;
    if (dropT >= SNAP_AT) {
      const maxStep = MAX_SPEED * dt;
      dx = Math.min(maxStep, Math.max(-maxStep, (trackX() - x) * (1 - Math.exp(-FOLLOW_RATE * dt))));
      x += dx;
    }

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

    const busy = dropping || moving || yaw !== yawTarget || gait > 0.01;
    idleFor = busy ? 0 : idleFor + dt;
    return busy;
  };

  const shouldRun = () => isReady && !disposed && pageVisible && started;

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
    // Standing still for a while: hold the last frame until scroll moves it.
    if (idleFor > IDLE_SLEEP_S) {
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
    cssW = width;
    cssH = height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    viewW = VIEW_H * (width / height);
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.updateProjectionMatrix();
    // A resize moves the track's ends; jump there rather than walk.
    x = trackX();
    if (isReady && !disposed && started) draw();
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
    renderer.toneMappingExposure = LOOKS[next].exposure;
    shadowStrength = SHADOW_OPACITY[next];
    if (isReady && !disposed && started) draw();
  };
  applyTheme(theme);

  const ready = (async () => {
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      // The first draw compiles instead.
    }
    if (disposed) return;
    // compileAsync links the programs, but each one's uniforms are looked up on its first draw, which costs most of
    // a second here. Draw once now, while the canvas is still hidden, so the drop's first frame does not pay it.
    try {
      renderer.render(scene, camera);
    } catch {
      // The drop's first frame tries again.
    }
    isReady = true;
    wake();
  })();

  return {
    ready,
    drop() {
      if (started || disposed) return;
      started = true;
      dropT = 0;
      x = trackX();
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      wake();
    },
    setPosition(value, immediate = false) {
      position = Math.min(1, Math.max(0, value));
      // Until it has come down, it comes down wherever scroll wants it.
      if (immediate || !started) x = trackX();
      wake();
    },
    applyTheme,
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      disposeTree(scene);
      environment.dispose();
      lensEnvironment.dispose();
      renderer.dispose();
    },
  };
}
