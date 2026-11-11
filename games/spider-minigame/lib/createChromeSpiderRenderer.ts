// The hero's chrome spider: the round 7 still from cutaway-ref/chrome/main.js, ported to a transparent canvas so
// the glass backdrop and the hero glow show round it. The look (environment cards, lights, floor, glow pool, camera)
// is copied value for value; the kit's runtime, the haze backdrop plane and the bloom pass are dropped (bloom does
// not keep the canvas' alpha, and at round 7's high threshold it only touched the hottest glows).
// Scroll sets the teardown; the loop eases toward it and turns the gears on their clock.
import * as THREE from "three";
import type { Theme } from "@/components/theme/ThemeProvider";
import { buildSpider, FLOOR_Y } from "./spider.js";

export interface ChromeSpiderRenderer {
  /** Resolves once the shaders are compiled and the first frame is drawn. */
  readonly ready: Promise<void>;
  /** Ease toward a teardown amount: 0 assembled, 1 fully apart. */
  setExplode(value: number): void;
  /** Jump straight to a teardown amount. */
  setExplodeDirect(value: number): void;
  /** Run or stop the animation loop (gears, palp twitches, the eased teardown). */
  setAnimated(animated: boolean): void;
  applyTheme(theme: Theme): void;
  dispose(): void;
}

export interface ChromeSpiderRendererOptions {
  canvas: HTMLCanvasElement;
  theme: Theme;
  animated: boolean;
  /** Draw the faint mirrored spider under the glossy floor. It is a second full build. */
  reflection: boolean;
}

type Vec3 = [number, number, number];
type Card = [width: number, height: number, dir: Vec3, color: string, strength: number];
type Band = [color: string, strength: number, height: number, y: number];
type Dome = [top: string, horizon: string, bottom: string, strength: number];

// The spider is heavy geometry; past this the extra pixels cost more than they show.
const MAX_PIXEL_RATIO = 1.5;
// How quickly the teardown catches up with scroll, per second.
const EXPLODE_RATE = 5;
// Round 7's camera: target, azimuth from +x (the face) toward +z, elevation, distance. Framed for 16:9; narrower
// screens pull the camera back so the legs stay in frame.
const CAM = { tx: -0.25, ty: -0.35, tz: -0.2, az: 0.62, el: 0.72, d: 8.3 };
const CAM_ASPECT = 16 / 9;
// A 390px phone (aspect ~0.46) needs ~3.85x to keep 16:9's full width; 3.2 keeps the leg tips in frame there
// without shrinking the spider to a speck.
const CAM_MAX_PULLBACK = 3.2;

// The dark look is round 7 as approved for the still. The light look lifts the fog so far parts fade toward the
// page instead of toward a dark haze, and calms the floor and the glow that read as stains on a light page.
// The mirrored floor spider only reads as a reflection on the dark stage; on a light page it shows through the pale
// floor as a second set of dark legs, so the light look hides it.
const LOOKS: Record<
  Theme,
  { exposure: number; fog: string; fogDensity: number; floorOpacity: number; glow: number; mirror: boolean }
> = {
  dark: { exposure: 0.88, fog: "#100709", fogDensity: 0.03, floorOpacity: 0.4, glow: 1, mirror: true },
  light: { exposure: 1.0, fog: "#e6e2e4", fogDensity: 0.012, floorOpacity: 0.22, glow: 0.55, mirror: false },
};

const POOL_OPACITY = 0.85;
const UNDER_INTENSITY = 12;

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

function radial(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, color);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
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

// Glowing cards round a black void, prefiltered for the chrome (or the lenses) to reflect. band: a soft neutral
// ring round the horizon, so every chrome face catches a silver gradient. dome: a studio sphere with a vertical
// gradient, so the chrome mirrors a bright neutral world and reads silver.
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

// What the chrome and the lenses reflect. The walker shares these so the two spiders read as the same machine.
export function spiderEnvironments(renderer: THREE.WebGLRenderer): {
  environment: THREE.Texture;
  lensEnvironment: THREE.Texture;
} {
  // What the chrome reflects: neutral softboxes for the silver streaks, thin amber, rose and red accents for the
  // colour, black everywhere else (round 7 values).
  const environment = cardEnvironment(
    renderer,
    "#060607",
    [
      [18, 10, [0.1, 1, 0.15], "#fff6ee", 2.7],
      [6, 4, [0.8, 0.45, 0.35], "#ffffff", 5],
      [4, 10, [0.55, 0.2, -0.8], "#d8dce2", 2.4],
      [4, 9, [0.35, 0.35, 0.87], "#e8e8ec", 1.8],
      [14, 0.9, [-0.95, 0.16, 0.05], "#ffb070", 6],
      [1.6, 12, [-0.3, 0.25, 0.9], "#ff4a9a", 2.2],
      [14, 1.6, [0.4, -0.5, 0], "#ff4a14", 1.0],
      // the warm card the floor's mirror ray finds from the hero camera, so the floor catches a sheen
      [16, 5, [-0.62, 0.62, -0.45], "#ff7a48", 1.4],
    ],
    0.02,
    ["#c9ccd2", 1.3, 14, 1.5],
    ["#d4d6da", "#7a7d82", "#141416", 1.0],
  );
  // The lenses see a darker world with a few hard cards, so they read deep black with crisp highlights.
  const lensEnvironment = cardEnvironment(
    renderer,
    "#050303",
    [
      [10, 6, [-0.2, 1, 0.2], "#ffb070", 2.5],
      [1.6, 12, [-0.85, 0.3, 0.45], "#ff3a78", 1.2],
      [3.2, 2.2, [0.42, 0.62, 0.66], "#ffe8d8", 4],
    ],
    0.01,
  );
  return { environment, lensEnvironment };
}

// The walker builds the same spider with the same look.
export { canvasTexture, disposeTree, LOOKS };

export function createChromeSpiderRenderer({
  canvas,
  theme,
  animated,
  reflection,
}: ChromeSpiderRendererOptions): ChromeSpiderRenderer {
  // Throws when WebGL is unavailable; the caller hides the spider.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  // three 0.186 removed PCFSoftShadowMap (it fell back to this with a console warning)
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2("#100709", 0.03);
  scene.fog = fog;

  const { environment, lensEnvironment } = spiderEnvironments(renderer);
  scene.environment = environment;

  // The amber key from above and behind (the shadows), a rose-magenta fill on the far side and on the camera side,
  // a dim red hemisphere.
  const key = new THREE.DirectionalLight("#ffa860", 4.0);
  key.position.set(-5, 7, 1.5);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
  key.shadow.camera.updateProjectionMatrix();
  const shadowSize = reflection ? 2048 : 1024;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rose = new THREE.DirectionalLight("#ff4aa0", 2.4);
  rose.position.set(1.5, 1.2, -5);
  const front = new THREE.DirectionalLight("#ff6ab0", 1.3);
  front.position.set(6, 3, 3);
  scene.add(rose, front, new THREE.HemisphereLight("#3a1430", "#050204", 0.5));

  // The floor: dark glossy metal fading out radially, a red-orange glow pooled in front of the spider, and a lamp
  // there lighting the underside from below.
  const fade = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2);
    rg.addColorStop(0, "#fff");
    rg.addColorStop(1, "#000");
    g.fillStyle = rg;
    g.fillRect(0, 0, w, h);
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#4a4044",
    metalness: 0.9,
    roughness: 0.24,
    envMapIntensity: 2.0,
    alphaMap: fade,
    transparent: true,
    opacity: 0.4,
    depthWrite: true,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), floorMaterial);
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);
  const poolMaterial = new THREE.MeshBasicMaterial({
    map: canvasTexture(512, 512, (g, w, h) => radial(g, w / 2, h / 2, w / 2, "rgba(255,110,40,1)")),
    transparent: true,
    opacity: POOL_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.5).rotateX(-Math.PI / 2), poolMaterial);
  pool.position.set(1.9, FLOOR_Y + 0.004, 0);
  scene.add(pool);
  const under = new THREE.PointLight("#ff4a1a", UNDER_INTENSITY, 6, 2);
  under.position.set(1.9, FLOOR_Y + 0.25, 0);
  scene.add(under);

  const spider = buildSpider();
  scene.add(spider.root);
  // The faint floor reflection: a second spider mirrored about the floor, its lamps stripped and no shadows, seen
  // through the floor's slight transparency.
  const mirror = reflection ? buildSpider() : null;
  if (mirror) {
    mirror.root.scale.y = -1;
    mirror.root.position.y = 2 * FLOOR_Y;
    const lamps: THREE.Object3D[] = [];
    mirror.root.traverse((object) => {
      if ((object as THREE.Light).isLight) lamps.push(object);
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = false;
    });
    for (const lamp of lamps) lamp.parent?.remove(lamp);
    scene.add(mirror.root);
  }
  for (const build of mirror ? [spider, mirror] : [spider]) {
    for (const material of [build.M.lens, build.M.lensGlass]) {
      material.envMap = lensEnvironment;
      material.needsUpdate = true;
    }
  }

  const camera = new THREE.PerspectiveCamera(30, CAM_ASPECT, 0.1, 80);
  const placeCamera = () => {
    const { tx, ty, tz, az, el } = CAM;
    const d = CAM.d * Math.min(CAM_MAX_PULLBACK, Math.max(1, CAM_ASPECT / camera.aspect));
    camera.position.set(
      tx + d * Math.cos(el) * Math.cos(az),
      ty + d * Math.sin(el),
      tz + d * Math.cos(el) * Math.sin(az),
    );
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
  };
  placeCamera();

  let explode = 0;
  let explodeTarget = 0;
  let elapsed = 0;
  let last = 0;
  let animatedNow = animated;
  let inView = true;
  let pageVisible = document.visibilityState !== "hidden";
  let isReady = false;
  let disposed = false;
  let loopFrame = 0;
  let stillFrame = 0;

  const draw = () => {
    spider.pose({ t: elapsed, spinT: elapsed, explode });
    // The light look hides the reflection; a hidden mirror needs no pose.
    if (mirror?.root.visible) mirror.pose({ t: elapsed, spinT: elapsed, explode });
    renderer.render(scene, camera);
  };

  const shouldRun = () => animatedNow && inView && pageVisible && isReady && !disposed;

  const loop = (now: number) => {
    loopFrame = 0;
    if (!shouldRun()) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    elapsed += dt;
    explode += (explodeTarget - explode) * (1 - Math.exp(-EXPLODE_RATE * dt));
    if (Math.abs(explodeTarget - explode) < 1e-4) explode = explodeTarget;
    draw();
    loopFrame = requestAnimationFrame(loop);
  };

  // Draws the next frame: through the loop while it runs, otherwise as one still. Nothing is drawn off screen or
  // in a hidden tab; coming back calls this again.
  const requestRender = () => {
    if (!isReady || disposed || !inView || !pageVisible || loopFrame) return;
    if (shouldRun()) {
      last = 0;
      loopFrame = requestAnimationFrame(loop);
      return;
    }
    if (stillFrame) return;
    stillFrame = requestAnimationFrame(() => {
      stillFrame = 0;
      if (!disposed) draw();
    });
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    placeCamera();
    requestRender();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const intersectionObserver = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1]?.isIntersecting ?? true;
    requestRender();
  });
  intersectionObserver.observe(canvas);

  const onVisibility = () => {
    pageVisible = document.visibilityState !== "hidden";
    requestRender();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const applyTheme = (next: Theme) => {
    const look = LOOKS[next];
    renderer.toneMappingExposure = look.exposure;
    fog.color.set(look.fog);
    fog.density = look.fogDensity;
    floorMaterial.opacity = look.floorOpacity;
    poolMaterial.opacity = POOL_OPACITY * look.glow;
    under.intensity = UNDER_INTENSITY * look.glow;
    if (mirror) mirror.root.visible = look.mirror;
    requestRender();
  };
  applyTheme(theme);

  const ready = (async () => {
    try {
      // Compile off the main thread where the browser supports it, so the first frame does not stall scroll.
      await renderer.compileAsync(scene, camera);
    } catch {
      // The first draw compiles instead.
    }
    if (disposed) return;
    isReady = true;
    draw();
    requestRender();
  })();

  return {
    ready,
    setExplode(value) {
      explodeTarget = Math.min(1, Math.max(0, value));
      // Only the running loop eases; a still jumps straight there.
      if (!shouldRun()) explode = explodeTarget;
      requestRender();
    },
    setExplodeDirect(value) {
      explodeTarget = explode = Math.min(1, Math.max(0, value));
      requestRender();
    },
    setAnimated(value) {
      animatedNow = value;
      if (!value) explode = explodeTarget;
      requestRender();
    },
    applyTheme,
    dispose() {
      disposed = true;
      if (loopFrame) cancelAnimationFrame(loopFrame);
      if (stillFrame) cancelAnimationFrame(stillFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      disposeTree(scene);
      environment.dispose();
      lensEnvironment.dispose();
      key.dispose();
      renderer.dispose();
    },
  };
}
