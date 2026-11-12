// The hero's scene, after a "RISE" type poster: "SHAN" in chunky letters stacked down the screen, each extruded into
// a long block that runs back and down behind the letter below. The faces run amber to coral, and the sides deepen
// through red to violet as they run back. The stack stands on a wide base slab, which gives the scene its angle, with
// a yellow slab off the right of the S and the H, among frosted glass tubes and rings and thin yellow and coral sticks.
// The canvas is transparent; the backdrop and its grain are CSS (.hero-scene in _hero.less): the page's own background
// in both themes. The letters are drawn here as outlines and extruded, so no font is loaded.
//
// After the intro lifts, play() raises the base and the letters one after another and pops the props in. From then on
// the stack floats and tilts a little toward the pointer, and every few seconds it hops: a crouch, a stretch up, a
// squashed landing and a wobble. The canvas is fixed behind the page, so as the hero scrolls away the stack sinks
// back, and the canvas blurs and dims (via --hero-scene-away) behind the sections rising over it. It stops drawing
// while the tab is hidden. With `still` it shows the finished scene and redraws only on resize.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";

export interface ShanSceneRenderer {
  /** Brings the base and the letters in, one after another. Only the first call counts; does nothing when still. */
  play(): void;
  dispose(): void;
}

export interface ShanSceneOptions {
  canvas: HTMLCanvasElement;
  /** Reduced motion: the finished scene, held still. */
  still: boolean;
}

type Vec3 = readonly [x: number, y: number, z: number];
// An outline corner, with an optional rounding radius (CORNER when omitted).
type Pt = readonly [x: number, y: number, r?: number];
type Glyph = { outline: readonly Pt[]; holes?: readonly (readonly Pt[])[] };
// How a block is extruded and shaded: its depth, its face from `bottom` to `top`, and the colours its sides pass
// through toward the back.
type Block = { depth: number; top: string; bottom: string; mid?: string; back?: string };
// Something in the stack: the pivot is placed (and animated in by play()), the body inside it floats.
type Floater = { pivot: THREE.Object3D; body: THREE.Object3D; rest: THREE.Vector3; phase: number; amp: number };

const MAX_PIXEL_RATIO = 1.75;
const FOV = 30;
// How much of the screen the stack's bounds may fill, across or down.
const FILL = 0.9;
// How the stack is turned: tipped back so the blocks trail down, and turned so they trail right.
const BASE_TURN = new THREE.Euler(-0.3, -0.45, -0.1);

// The letters: a cap height of 1, extruded this deep, long enough that each block runs back behind the letter below.
const DEPTH = 2.4;
// Rings of vertices along each block's length, so its sides can shade through the mid colour on the way back.
const DEPTH_STEPS = 16;
const CORNER = 0.035;
// The S's bars and the stems of H, A and N.
const BAR = 0.22;
const STEM = 0.24;
const S_W = 0.78;
const H_W = 0.8;
const N_W = 0.82;

const GLYPHS: Record<"S" | "H" | "A" | "N", Glyph> = {
  // Three bars (0-0.22, 0.39-0.61, 0.78-1) joined by alternate stems, the outer corners rounded into bowls.
  S: {
    outline: [
      [0, 0, 0.06],
      [S_W, 0, 0.3],
      [S_W, 0.61, 0.2],
      [BAR, 0.61, 0.04],
      [BAR, 0.78, 0.08],
      [S_W, 0.78, 0.06],
      [S_W, 1, 0.06],
      [0, 1, 0.3],
      [0, 0.39, 0.2],
      [S_W - BAR, 0.39, 0.04],
      [S_W - BAR, 0.22, 0.08],
      [0, 0.22, 0.06],
    ],
  },
  H: {
    outline: [
      [0, 0],
      [STEM, 0],
      [STEM, 0.39],
      [H_W - STEM, 0.39],
      [H_W - STEM, 0],
      [H_W, 0],
      [H_W, 1],
      [H_W - STEM, 1],
      [H_W - STEM, 0.61],
      [STEM, 0.61],
      [STEM, 1],
      [0, 1],
    ],
  },
  // Two legs with a flat top and a crossbar, and the triangle above the bar cut out.
  A: {
    outline: [
      [0, 0],
      [0.22, 0],
      [0.282, 0.2],
      [0.618, 0.2],
      [0.68, 0],
      [0.9, 0],
      [0.59, 1],
      [0.31, 1],
    ],
    holes: [
      [
        [0.338, 0.38],
        [0.45, 0.742],
        [0.562, 0.38],
      ],
    ],
  },
  // Two stems and a diagonal as thick as them.
  N: {
    outline: [
      [0, 0],
      [STEM, 0],
      [STEM, 0.55],
      [N_W - STEM, 0],
      [N_W, 0],
      [N_W, 1],
      [N_W - STEM, 1],
      [N_W - STEM, 0.45],
      [STEM, 1],
      [0, 1],
    ],
  },
};

// A rounded rectangle, for the base and the yellow slab.
function rect(width: number, height: number, r = 0.05): Glyph {
  return {
    outline: [
      [0, 0, r],
      [width, 0, r],
      [width, height, r],
      [0, height, r],
    ],
  };
}

// Top to bottom, each a little off the line and at its own depth, so their blocks overlap.
const LETTERS: readonly { glyph: keyof typeof GLYPHS; at: Vec3; tilt: number; top: string; bottom: string }[] = [
  { glyph: "S", at: [-0.18, 1.42, 0], tilt: 0.06, top: "#ffbe55", bottom: "#ff6a3d" },
  { glyph: "H", at: [0.2, 0.47, 0.28], tilt: -0.05, top: "#ff9a66", bottom: "#ff4f6a" },
  { glyph: "A", at: [-0.14, -0.48, 0.06], tilt: 0.05, top: "#ffc845", bottom: "#ff8530" },
  { glyph: "N", at: [0.17, -1.43, 0.3], tilt: -0.04, top: "#ff8a62", bottom: "#ff4a6e" },
];
// The colours the letters' sides pass through as they run back: a deeper coral, then violet at the far end.
const SIDE_MID = "#e8455a";
const SIDE_BACK = "#4c3cc8";

// The base the stack stands on: a wide, deep slab just under the N, its face shading from coral into violet.
const BASE: { glyph: Glyph; at: Vec3 } & Block = {
  glyph: rect(2.1, 0.34),
  at: [0.12, -2.18, 0.45],
  depth: DEPTH + 0.5,
  top: "#ff7457",
  bottom: "#5a3fd0",
};
// A flat yellow slab off the right of the S and the H, like the one behind the poster's S. The letters' blocks run
// back through its depth, so it stands just clear of their column (the H's right edge is near x 0.66) rather than
// behind them, where it would cut through them.
const SLAB: { glyph: Glyph; at: Vec3; tilt: number } & Block = {
  glyph: rect(0.85, 1.0),
  at: [1.25, 1.0, -0.55],
  tilt: -0.08,
  depth: 0.32,
  top: "#ffd23a",
  bottom: "#ffa21f",
  mid: "#ff9a1f",
  back: "#e0602a",
};

// The frosted glass: open tubes and short rings with a visible wall, most along the poster's diagonal.
const GLASS_WALL = 0.04;
const TUBES: readonly { at: Vec3; turn: Vec3; radius: number; length: number }[] = [
  // A wide tube behind the S, to its left.
  { at: [-1.15, 1.05, -0.5], turn: [0.35, 0, 0.62], radius: 0.34, length: 1.4 },
  // Rings off the right of the S and the H.
  { at: [1.0, 1.6, 0.05], turn: [1.2, 0.2, 0.5], radius: 0.27, length: 0.24 },
  { at: [1.08, 0.25, 0.3], turn: [0.4, 1.1, 0.2], radius: 0.3, length: 0.26 },
  { at: [0.86, -0.3, 0.6], turn: [1.0, 0.4, 0], radius: 0.14, length: 0.11 },
  // Narrow tubes either side of the N, and a ring at the left end of the base.
  { at: [-0.95, -1.2, 0.3], turn: [0.3, 0, 0.62], radius: 0.19, length: 0.95 },
  { at: [0.82, -1.5, 0.45], turn: [-0.3, 0, 0.62], radius: 0.18, length: 0.85 },
  { at: [-1.2, -1.95, 0.75], turn: [1.3, 0, 0.2], radius: 0.16, length: 0.18 },
];
// The thin sticks, all parallel to the diagonal.
const STICK_RADIUS = 0.035;
const STICK_TURN = 0.6;
const STICKS: readonly { at: Vec3; length: number; color: string }[] = [
  { at: [0.62, 1.95, -0.3], length: 0.8, color: "#ffc21f" },
  { at: [-1.35, -0.85, 0.35], length: 1.35, color: "#ffc21f" },
  { at: [1.3, -0.95, 0.05], length: 0.7, color: "#ff6b5e" },
];

// The entrance: how far below its place each block starts, how long it takes, and the gap between blocks.
const ENTER_DROP = 4;
const ENTER_DURATION = 1.4;
const ENTER_STAGGER = 0.12;
const PROPS_DELAY = 0.65;

// The hop: how high the stack springs (a random height in this range, in letter heights), and the wait between hops
// in seconds. It waits for the next turn while the hero is mostly scrolled away.
const HOP_HEIGHT: readonly [min: number, max: number] = [0.2, 0.32];
const HOP_GAP: readonly [min: number, max: number] = [5, 10];
// The base's underside (half its 0.34 height, plus the bevel): the squash and stretch keep it planted here.
const FOOT_Y = BASE.at[1] - 0.2;

// Traces a closed outline into a path, rounding each corner by its radius (never more than half either edge).
function trace<P extends THREE.Path>(path: P, points: readonly Pt[]): P {
  const n = points.length;
  const v = points.map(([x, y]) => new THREE.Vector2(x, y));
  v.forEach((p, i) => {
    const a = v[(i + n - 1) % n] ?? p;
    const b = v[(i + 1) % n] ?? p;
    const la = p.distanceTo(a);
    const lb = p.distanceTo(b);
    const r = Math.min(points[i]?.[2] ?? CORNER, la / 2, lb / 2);
    const from = p.clone().lerp(a, r / la);
    const to = p.clone().lerp(b, r / lb);
    if (i === 0) path.moveTo(from.x, from.y);
    else path.lineTo(from.x, from.y);
    path.quadraticCurveTo(p.x, p.y, to.x, to.y);
  });
  path.closePath();
  return path;
}

// One outline as a solid block, centred, its face at z 0 and its body running back. Vertex colours shade the face
// from `bottom` to `top`, and take the sides through `mid` to `back` toward the far end.
function blockGeometry(glyph: Glyph, block: Block): THREE.ExtrudeGeometry {
  const shape = trace(new THREE.Shape(), glyph.outline);
  for (const hole of glyph.holes ?? []) shape.holes.push(trace(new THREE.Path(), hole));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: block.depth,
    steps: DEPTH_STEPS,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  const size = box.getSize(new THREE.Vector3());
  geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.max.z);

  const topColor = new THREE.Color(block.top);
  const bottomColor = new THREE.Color(block.bottom);
  const midColor = new THREE.Color(block.mid ?? SIDE_MID);
  const backColor = new THREE.Color(block.back ?? SIDE_BACK);
  const face = new THREE.Color();
  const color = new THREE.Color();
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const up = position.getY(i) / size.y + 0.5;
    const back = Math.pow(THREE.MathUtils.clamp(-position.getZ(i) / size.z, 0, 1), 0.7);
    face.copy(bottomColor).lerp(topColor, up);
    // The first stretch deepens toward the mid colour, the rest fades from there to the back colour.
    if (back < 0.45) color.copy(face).lerp(midColor, (back / 0.45) * 0.7);
    else color.copy(face).lerp(midColor, 0.7).lerp(backColor, ((back - 0.45) / 0.55) * 0.85);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// An open glass tube (or a ring, when short) with a wall GLASS_WALL thick, along y.
function tubeGeometry(radius: number, length: number): THREE.LatheGeometry {
  const inner = radius - GLASS_WALL;
  const h = length / 2;
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(inner, -h),
      new THREE.Vector2(radius, -h),
      new THREE.Vector2(radius, h),
      new THREE.Vector2(inner, h),
      new THREE.Vector2(inner, -h),
    ],
    64,
  );
}

export function createShanScene({ canvas, still }: ShanSceneOptions): ShanSceneRenderer {
  // Throws when WebGL is unavailable; the caller leaves the backdrop on its own.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps the coral and amber from washing toward yellow as ACES would.
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.45;

  // A warm key on the faces from the upper left, rose on the right-hand sides, and blue from below, which turns
  // the undersides violet like the poster's.
  const key = new THREE.DirectionalLight("#fff1e0", 2.4);
  key.position.set(-3, 5, 6);
  const rose = new THREE.DirectionalLight("#ff5c9d", 1.8);
  rose.position.set(5, -1, 2);
  const under = new THREE.DirectionalLight("#4b5dff", 2.2);
  under.position.set(1, -6, -1);
  scene.add(key, rose, under, new THREE.HemisphereLight("#ffe0cc", "#2232b0", 0.7));

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  // The stack turns about its own origin; `fit` moves it so its bounds sit centred in front of the camera.
  const fit = new THREE.Group();
  const stack = new THREE.Group();
  stack.rotation.copy(BASE_TURN);
  fit.add(stack);
  scene.add(fit);
  // Everything stands in `squash`, which the hop lifts and squashes about the base's underside. The whole stack
  // moves as one, so the hop never pushes one block into another.
  const squash = new THREE.Group();
  stack.add(squash);

  const blockMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.45,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
  });
  // Frosted glass without transmission (which would draw the scene twice a frame): pale, half see-through, with
  // a clearcoat to catch the highlights and a pink sheen at grazing angles.
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#cfc8ff",
    roughness: 0.28,
    metalness: 0,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    sheen: 0.6,
    sheenColor: new THREE.Color("#ffc9ee"),
  });

  const place = (body: THREE.Object3D, at: Vec3, phase: number, amp: number): Floater => {
    const pivot = new THREE.Group();
    pivot.position.set(...at);
    pivot.add(body);
    squash.add(pivot);
    return { pivot, body, rest: pivot.position.clone(), phase, amp };
  };

  // The base holds still; everything on it floats a little.
  const base = place(new THREE.Mesh(blockGeometry(BASE.glyph, BASE), blockMaterial), BASE.at, 0, 0);

  const letters = LETTERS.map(({ glyph, at, tilt, top, bottom }, i) => {
    const mesh = new THREE.Mesh(blockGeometry(GLYPHS[glyph], { depth: DEPTH, top, bottom }), blockMaterial);
    mesh.rotation.z = tilt;
    return place(mesh, at, i * 1.3, 0.03);
  });

  const slab = new THREE.Mesh(blockGeometry(SLAB.glyph, SLAB), blockMaterial);
  slab.rotation.z = SLAB.tilt;

  const props = [
    place(slab, SLAB.at, 3.1, 0.04),
    ...TUBES.map(({ at, turn, radius, length }, i) => {
      const mesh = new THREE.Mesh(tubeGeometry(radius, length), glassMaterial);
      mesh.rotation.set(...turn);
      return place(mesh, at, 0.7 + i * 0.9, 0.06);
    }),
    ...STICKS.map(({ at, length, color }, i) => {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(STICK_RADIUS, length, 6, 16),
        new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.2 }),
      );
      mesh.rotation.z = STICK_TURN;
      return place(mesh, at, 2.1 + i * 1.7, 0.05);
    }),
  ];
  // What rises in, bottom first: the base, then the letters top to bottom.
  const risers = [base, ...letters];
  const floaters = [...risers, ...props];

  // The turned stack's bounds, measured once: centred in front of the camera, and fitted to the screen in resize().
  stack.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(stack);
  const extent = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  fit.position.copy(bounds.getCenter(new THREE.Vector3())).negate();

  const render = () => renderer.render(scene, camera);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Far enough that the front of the bounds fits, whichever way the screen is tighter.
    const distance = Math.max(extent.y / (tan * FILL), extent.x / (tan * camera.aspect * FILL));
    camera.position.set(0, 0, extent.z + distance);
    camera.updateProjectionMatrix();
    if (still) render();
    else schedule();
  };

  let raf = 0;
  let last = 0;
  let time = 0;
  let live = true;
  const pointer = new THREE.Vector2();
  const tilt = new THREE.Vector2();

  // 0 with the hero filling the screen, 1 once it has scrolled away.
  const awayNow = () => THREE.MathUtils.clamp(window.scrollY / window.innerHeight, 0, 1);
  // Hands it to the CSS, which blurs and dims the canvas behind the sections. Only written when it changes.
  let shownAway = -1;
  const showAway = (away: number) => {
    const rounded = Math.round(away * 100) / 100;
    if (rounded === shownAway) return;
    shownAway = rounded;
    canvas.style.setProperty("--hero-scene-away", String(rounded));
  };
  // Held still, only the blur and dim follow scroll.
  const onScroll = () => showAway(awayNow());

  // The hop's state, tweened by hopOnce(): the lift along the stack, the squash (1 at rest) and a little roll.
  const hop = { y: 0, squash: 1, roll: 0 };
  let hopWait: ReturnType<typeof gsap.delayedCall> | null = null;
  let hopping: ReturnType<typeof gsap.timeline> | null = null;
  const queueHop = () => {
    hopWait = gsap.delayedCall(gsap.utils.random(HOP_GAP[0], HOP_GAP[1]), hopOnce);
  };
  // A crouch, a spring up stretching, a short hang, the fall, a squashed landing and a wobble back to rest. While
  // the hero is mostly scrolled away, or the tab is hidden, it waits for the next turn instead.
  function hopOnce() {
    if (!live) return;
    if (document.hidden || awayNow() > 0.25) {
      queueHop();
      return;
    }
    const height = gsap.utils.random(HOP_HEIGHT[0], HOP_HEIGHT[1]);
    const roll = gsap.utils.random(-0.06, 0.06);
    hopping = gsap
      .timeline({ onComplete: queueHop })
      .to(hop, { squash: 0.9, duration: 0.16, ease: "power2.out" })
      .to(hop, { y: height, squash: 1.06, roll, duration: 0.3, ease: "power2.out" })
      .to(hop, { y: height * 1.04, squash: 1, duration: 0.14, ease: "sine.inOut" })
      .to(hop, { y: 0, squash: 1.04, roll: 0, duration: 0.26, ease: "power2.in" })
      .to(hop, { squash: 0.87, duration: 0.07, ease: "power1.out" })
      .to(hop, { squash: 1, duration: 0.8, ease: "elastic.out(1, 0.35)" });
  }

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    time += dt;

    tilt.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    const away = awayNow();
    showAway(away);
    // As the sections rise over it, the stack tips back a little and sinks away from the camera, so it falls behind
    // them rather than leaving the top of the screen.
    stack.rotation.set(
      BASE_TURN.x + tilt.y * 0.12 + away * 0.2,
      BASE_TURN.y + tilt.x * 0.22 + Math.sin(time * 0.35) * 0.05,
      BASE_TURN.z + hop.roll,
    );
    stack.position.set(0, Math.sin(time * 0.6) * 0.06 + away * 0.25, -away * 2.5);
    // Squash and stretch keep the volume: narrower as it stretches, wider as it squashes, the base staying put.
    const across = 1 / Math.sqrt(hop.squash);
    squash.scale.set(across, hop.squash, across);
    squash.position.y = hop.y + FOOT_Y * (1 - hop.squash);
    for (const f of floaters) f.body.position.y = Math.sin(time * 0.9 + f.phase) * f.amp;

    render();
    schedule();
  };

  function schedule() {
    if (!raf && live && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const onPointer = (event: PointerEvent) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  if (still) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    resize();
  } else {
    // Hidden until play(), so nothing shows before its entrance. The canvas is fixed, so it is always on screen;
    // the loop runs until the tab is hidden.
    stack.visible = false;
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    resize();
  }

  let played = false;

  return {
    play() {
      if (played || still) return;
      played = true;
      risers.forEach(({ pivot, rest }, i) => {
        const delay = 0.1 + i * ENTER_STAGGER;
        const ease = "expo.out";
        gsap.fromTo(pivot.position, { y: rest.y - ENTER_DROP }, { y: rest.y, duration: ENTER_DURATION, ease, delay });
        gsap.fromTo(pivot.rotation, { x: -1.1 }, { x: 0, duration: ENTER_DURATION, ease, delay });
        gsap.fromTo(
          pivot.scale,
          { x: 0.5, y: 0.5, z: 0.5 },
          { x: 1, y: 1, z: 1, duration: ENTER_DURATION * 0.85, ease, delay },
        );
      });
      props.forEach(({ pivot }, i) => {
        gsap.fromTo(
          pivot.scale,
          { x: 0.0001, y: 0.0001, z: 0.0001 },
          { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(1.7)", delay: PROPS_DELAY + i * 0.06 },
        );
      });
      stack.visible = true;
      schedule();
      // The first hop comes a few seconds after the entrance (about two seconds) has settled.
      queueHop();
    },

    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      live = false;
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", schedule);
      for (const { pivot } of floaters) gsap.killTweensOf([pivot.position, pivot.rotation, pivot.scale]);
      hopWait?.kill();
      hopping?.kill();

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        geometries.add(mesh.geometry);
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m);
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
