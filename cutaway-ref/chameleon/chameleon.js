// SHUX robotic chameleon, built after cutaway-ref/chameleon-reference.jpg. The picture is a watermarked stock image and
// only a visual guide: every part here is built in code. Dark graphite armour in separate bands over a black core, a
// ribbed spine ridge, lighter grey square inlays on the rear flank, a raised casque, one big turret eye per side (a
// bolted housing with a thick lip round a glossy blue-black lens), three green LEDs behind each eye, four thin legs on
// round bolted hubs with two opposed toe bundles per foot, and a segmented tail that rolls into a spiral.
// Borrowed: the chrome spider's legs (feet are body-frame targets solved by 2-bone IK; legHome/legTuck feed the site
// walker), the wasp's lens with a thick lip, and the wasp's segmented antenna, which becomes the tail.
// Body frame: +x forward (the snout), y up, +z the chameleon's right; the floor is FLOOR_Y. Paired parts are built for
// the right side and mirrored (scale.z = -1): side 0 is the left, side 1 the right.
// pose({explode, t, spinT, feet, tuck, reach, curl}) sets the whole chameleon for one moment.
import * as THREE from 'three';
import {aimX, cylX, cylZ, D2R, gearX, merge, put, rbox, ring, sweepX, taperTube, tube, V3} from '../chrome/parts.js';

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ssw = (e, s, f) => smoother((e - s) / (f - s));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;

// body units: the snout (x 1.3) to the tail base (x -1.1) is 2.4, the checklist's L
export const FLOOR_Y = -0.8;
// the wrist hub's height over the floor; the toes reach down from it to the surface
export const FOOT_H = 0.07;

// round 5: the lens cup and its dome shade from the environment only. Round 4's amber hot spot was the key light's
// specular on the glossy dome (bloom spread it), and a second warm glint came from the under light; the cool lens
// world (main.js lensEnv) keeps the one white window the reference has.
const envOnly = (m) => {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <lights_fragment_end>',
      [
        '#include <lights_fragment_end>',
        'reflectedLight.directDiffuse = vec3(0.0);',
        'reflectedLight.directSpecular = vec3(0.0);',
        '#ifdef USE_CLEARCOAT',
        'clearcoatSpecularDirect = vec3(0.0);',
        '#endif',
        '#ifdef USE_SHEEN',
        'sheenSpecularDirect = vec3(0.0);',
        '#endif',
      ].join('\n'),
    );
  };
  m.customProgramCacheKey = () => 'cham-env-only';
  return m;
};

export function makeChameleonMaterials() {
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    // satin graphite armour with a clear coat, so the stage's rim lights draw thin lines along the plate edges
    // round 2: darker and more satin, with less reflection (round 1 read rose-tinted gloss, dark share 0.71 of the reference's)
    armour: phys({color: '#25282c', roughness: 0.46, metalness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.22, envMapIntensity: 0.6}),
    // the darker plates: the casque crest, the spine ribs, the belly, the toes
    armourDk: phys({color: '#16181b', roughness: 0.5, metalness: 0.35, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 0.5}),
    // the lighter grey square inlays on the rear flank
    // round 2: mid grey (round 1's read near white)
    inlay: phys({color: '#565a60', roughness: 0.5, metalness: 0.35, clearcoat: 0.3, clearcoatRoughness: 0.25, envMapIntensity: 0.6}),
    black: std({color: '#0a0b0d', roughness: 0.55, metalness: 0.3}),
    // round 3: satin, not polished. Round 2's test stills traced the two shoulder and elbow flares to the rose backlight
    // grazing the gunmetal neck gear and elbow hub, with bloom spreading them
    gunmetal: std({color: '#33363b', roughness: 0.52, metalness: 0.6}),
    steel: std({color: '#9ca2a9', roughness: 0.4, metalness: 1}),
    // the eye: a deep glossy cup and a teal iris under a dark glass dome
    lens: envOnly(phys({color: '#020a10', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5})),
    iris: std({color: '#123444', roughness: 0.3, metalness: 0.7}),
    lensGlass: envOnly(phys({color: '#8fb4c8', roughness: 0, metalness: 0, transmission: 1, thickness: 0, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, envMapIntensity: 1.6})),
    // the only accent: three green LEDs behind each eye
    led: std({color: '#000000', emissive: '#3dff6e', emissiveIntensity: 2.6}),
  };
}

// a closed tube lofted along x through superellipse sections {x, cy, hy, hz} (exponent p), m points round each,
// both ends capped; angle 0 is +y, 90 degrees is +z
function loft(sections, {m = 48, p = 2.4} = {}) {
  const pos = [];
  const idx = [];
  const e = 2 / p;
  const se = (c) => Math.sign(c) * Math.pow(Math.abs(c), e);
  for (const s of sections) {
    for (let j = 0; j < m; j++) {
      const a = (j / m) * Math.PI * 2;
      pos.push(s.x, s.cy + s.hy * se(Math.cos(a)), s.hz * se(Math.sin(a)));
    }
  }
  const n = sections.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * m + j;
      const b = i * m + ((j + 1) % m);
      const c = (i + 1) * m + ((j + 1) % m);
      const d = (i + 1) * m + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  for (const [i, first] of [
    [0, true],
    [n - 1, false],
  ]) {
    const s = sections[i];
    const ci = pos.length / 3;
    pos.push(s.x, s.cy, 0);
    for (let j = 0; j < m; j++) {
      const a = i * m + j;
      const b = i * m + ((j + 1) % m);
      if (first) idx.push(ci, b, a);
      else idx.push(ci, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- the head: a lofted wedge from x 0.2 to the snout
const HX0 = 0.2;
const HX1 = 1.3;
const HP = 2.4;
/** The head's section at u (0 the back of the shell, 1 the snout): a rounded back, a tall middle, a blunt snout tipped down. */
export const headSec = (u) => {
  const back = u < 0.1 ? Math.sqrt(Math.max(0, 1 - ((0.1 - u) / 0.1) ** 2)) : 1;
  const f = Math.sqrt(Math.max(0, 1 - u * u * u)) * back;
  return {x: HX0 + (HX1 - HX0) * u, cy: 0.05 - 0.12 * u, hy: 0.44 * f * (1 - 0.32 * u) + 0.004, hz: 0.25 * f * (1 - 0.5 * u) + 0.004};
};
const se = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / HP);
const headPt = (u, a, off = 0) => {
  const s = headSec(u);
  return new V3(s.x, s.cy + (s.hy + off) * se(Math.cos(a * D2R)), (s.hz + off) * se(Math.sin(a * D2R)));
};

// ---------------------------------------------------------------- the torso: an arched, laterally flattened body
const TX0 = 0.3;
const TX1 = -1.1;
const ts = (x) => clamp((TX0 - x) / (TX0 - TX1), 0, 1);
// the spine's top (high point about 0.45 back from the neck), the belly, the half width
const tTop = (s) => 0.1 + 0.34 * Math.sin(Math.PI * (0.2 + 0.72 * s));
const tBot = (s) => -0.3 - 0.04 * Math.sin(Math.PI * s) + 0.26 * s * s * s;
const tW = (s) => 0.2 + 0.06 * Math.sin(Math.PI * s) - 0.06 * s;
const tor = (x) => {
  const s = ts(x);
  const t = tTop(s);
  const b = tBot(s);
  return {cy: (t + b) / 2, hh: (t - b) / 2, ww: tW(s)};
};
// a point on the band ellipse at angle a (radians, 0 = +y), and the angle of its outward normal
const onEll = (hh, ww, a, off = 0) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {y: (hh + off) * c, z: (ww + off) * s, an: Math.atan2(s / ww, c / hh)};
};
// a chamfered plate profile round x: w half-width along x, outer radius r, wall t, radial chamfer cr, x chamfer cx
const plateP = (w, r, t, cr, cx) => [
  [-w, r - t],
  [-w, r - cr],
  [-w + cx, r],
  [w - cx, r],
  [w, r - cr],
  [w, r - t],
];
// a sleeve round a leg link from x0 to x1, outer radius r, chamfer ch
const sleeveP = (x0, x1, r, ch) => [
  [x0, r * 0.62],
  [x0, r - ch],
  [x0 + ch, r],
  [x1 - ch, r],
  [x1, r - ch],
  [x1, r * 0.62],
];

// ---------------------------------------------------------------- the eye turret
const HR = 0.32; // housing radius: 0.27 L across
const LR = 0.22; // lens radius: 0.19 L across

// ---------------------------------------------------------------- legs
// right side: the hip (x, y; z sits on the flank), the foot's home (x, out), segment lengths, the elbow's pole
// (front elbows point back and out, hind knees forward and out)
export const LEGS = [
  {key: 'F', hip: [0.12, -0.16], home: [0.55, 0.48], L1: 0.44, L2: 0.42, pole: [-0.55, 0.2, 1]},
  {key: 'H', hip: [-0.8, -0.1], home: [-0.62, 0.5], L1: 0.47, L2: 0.45, pole: [0.55, 0.2, 1]},
];
export const LEG_NAMES = ['LF', 'LH', 'RF', 'RH'];
/** The home wrist spot of leg i (0-1 left, 2-3 right) in the body frame. */
export const legHome = (i) => {
  const L = LEGS[i % 2];
  return [L.home[0], FLOOR_Y + FOOT_H, (i < 2 ? -1 : 1) * L.home[1]];
};
// the legs pulled in under the body (the drop on its thread)
const TUCK = [
  [0.42, -0.36, 0.34],
  [-0.62, -0.3, 0.32],
];
export const legTuck = (i) => {
  const T = TUCK[i % 2];
  return [T[0], T[1], (i < 2 ? -1 : 1) * T[2]];
};

// ---------------------------------------------------------------- the tail
const TN = 40;
const TL = 2.4;
// round 6: the base at y 0.09, centred in the rump where the tail joins it (round 2 had lowered it to 0.04)
const TB = [-1.1, 0.09];
// round 6: 0.1 rad down. Round 3's 0.32 sank the spiral's low point about 0.3 below the floor (-1.10 against the feet's
// -0.80); the stage's 40% floor drawn over it passed for the reflection, so the still did not show it
const PHI0 = Math.PI + 0.1;
// curvature along the tail: k(s) = curl * (TKA + TKB * (s / TL)^3), so it droops, then rolls tight at the tip
// round 6: TKB 25 (from 13) rolls the tip up sooner, so the spiral's low point sits at foot level and it is tighter
const TKA = 1.2;
const TKB = 25;

export function buildChameleon() {
  const M = makeChameleonMaterials();
  const root = new THREE.Group();
  const grp = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  // small parts merged per parent and material at the end
  const bins = new Map();
  const decal = (parent, geo, mat, m) => {
    if (!bins.has(parent)) bins.set(parent, new Map());
    const b = bins.get(parent);
    if (!b.has(mat)) b.set(mat, []);
    b.get(mat).push(m ? geo.applyMatrix4(m) : geo);
  };
  const flush = () => {
    for (const [parent, b] of bins) for (const [mat, list] of b) put(parent, merge(list), mat);
    bins.clear();
  };
  const m4 = new THREE.Matrix4();
  const mR = new THREE.Matrix4();
  const at = (x, y, z, ax = 0) => m4.makeTranslation(x, y, z).multiply(mR.makeRotationX(ax));
  const boltGeo = (s = 1) => new THREE.CylinderGeometry(0.009 * s, 0.0105 * s, 0.014 * s, 8);
  // a round bolted hub round z: gunmetal drum, dark face, black cap, steel pin, n steel bolts through both faces
  const hubZ = (parent, r, w, n) => {
    const g = grp(parent);
    put(g, cylZ(r, r, w, 36), M.gunmetal);
    put(g, cylZ(r * 0.86, r * 0.86, w + 0.012, 36), M.armourDk);
    put(g, cylZ(r * 0.42, r * 0.42, w + 0.022, 24), M.black);
    put(g, cylZ(r * 0.15, r * 0.15, w + 0.04, 12), M.steel);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      decal(g, cylZ(0.0095, 0.0095, w + 0.03, 8), M.steel, m4.makeTranslation(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64, 0));
    }
    return g;
  };
  // explode items: a part's home, a direction and a distance it travels over its window s..f
  const X = [];
  const ex = (obj, dir, dist, s = 0, f = 1) => {
    X.push({obj, home: obj.position.clone(), dir: new V3(...dir).normalize(), dist, s, f});
    return obj;
  };
  const clear = [];
  const anchors = {};
  const anchor = (key, obj, x, y, z) => {
    if (!anchors[key]) anchors[key] = {obj, at: new V3(x, y, z)};
  };
  const mirror = (parent) =>
    [-1, 1].map((s) => {
      const g = new THREE.Group();
      g.scale.z = s;
      parent.add(g);
      return g;
    });
  const spinners = [];
  const body = grp(root);
  const sides = mirror(body);

  // ================================================================ head
  const headG = grp(body);
  {
    const secs = [];
    for (let k = 0; k <= 40; k++) secs.push(headSec(k / 40));
    put(headG, loft(secs, {m: 64, p: HP}), M.armour);
    // the casque: a raised dark crest over the back of the skull
    const crest = [];
    for (let k = 0; k <= 24; k++) {
      const v = k / 24;
      const s = headSec(0.08 + 0.52 * v);
      const b = Math.sqrt(Math.sin(Math.PI * v));
      // round 2: taller and narrower, so the casque stands over the skull
      crest.push({x: s.x, cy: s.cy + s.hy * 0.9, hy: 0.12 * b + 0.003, hz: s.hz * 0.42 * b + 0.003});
    }
    const cg = grp(headG);
    put(cg, loft(crest, {m: 48, p: 2.6}), M.armourDk);
    anchor('casque', cg, 0.5, 0.45, 0);
    ex(cg, [0, 1, 0], 0.22, 0.1, 0.7);
    // seams: the jaw line on both sides, a ring in front of the eye
    for (const a of [112, -112]) {
      const pts = [];
      for (let k = 0; k <= 16; k++) pts.push(headPt(0.3 + (0.685 * k) / 16, a, 0.002));
      put(headG, tube(pts, 0.009, 64, 6), M.black);
    }
    {
      const pts = [];
      for (let k = 0; k < 48; k++) pts.push(headPt(0.8, (k / 48) * 360, 0.002));
      put(headG, tube(pts, 0.007, 96, 6, true), M.black);
    }
    // the small bump on top of the snout
    const bump = put(headG, new THREE.SphereGeometry(0.045, 20, 12), M.armourDk);
    bump.position.copy(headPt(0.9, 0, -0.012));
    bump.scale.y = 0.7;
  }
  anchor('head', headG, 0.9, 0.1, 0.2);
  ex(headG, [1, 0.12, 0], 0.32, 0.05, 0.7);
  // the neck: a gear ring and hoses between the head and the torso, seen when the head slides off
  {
    const neck = grp(body, 0.24, 0.0, 0);
    const gr = grp(neck);
    put(gr, gearX(20, 0.22, 0.2, 0.05, 0.08, 5), M.gunmetal);
    put(gr, cylX(0.09, 0.09, 0.08, 20), M.black);
    spinners.push({obj: gr, rate: 1.2});
    for (const s of [-1, 1]) {
      put(neck, tube([[0.24, -0.16, s * 0.1], [0.12, -0.2, s * 0.15], [-0.04, -0.18, s * 0.14], [-0.14, -0.12, s * 0.1]], 0.016, 24, 8), M.black);
      put(neck, tube([[0.24, 0.12, s * 0.08], [0.1, 0.16, s * 0.12], [-0.06, 0.15, s * 0.1]], 0.012, 24, 8), M.gunmetal);
    }
  }

  // the eyes and the LEDs, per side
  const eyes = [];
  for (const [si, side] of mirror(headG).entries()) {
    const s = headSec(0.46);
    const eg = grp(side, s.x, s.cy + 0.02, s.hz * 0.8);
    const sw = grp(eg);
    const mount = grp(sw);
    aimX(mount, new V3(0.2, 0.1, 1));
    // the housing: a cone out of the head side, a thick bolted lip
    put(
      mount,
      sweepX(
        [
          [-0.1, 0],
          [-0.1, HR],
          [0.03, HR],
          [0.12, HR * 0.9],
          [0.17, HR * 0.84],
          [0.17, 0],
        ],
        {segs: 72, smooth: 30},
      ),
      M.armour,
    );
    put(mount, ring(0.15, 0.215, LR * 0.94, HR * 0.88, 0.016, {segs: 72}), M.armourDk);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.15;
      const rr = (LR * 0.94 + HR * 0.88) / 2;
      decal(mount, boltGeo(1.3).rotateZ(-Math.PI / 2), M.steel, m4.makeTranslation(0.218, Math.cos(a) * rr, Math.sin(a) * rr));
    }
    // inside the lip: a deep glossy cup, a teal iris of eight blades, a black pupil, all under a glass dome
    put(mount, ring(0.12, 0.19, 0, LR * 0.96, 0.004, {segs: 64}), M.lens);
    put(mount, ring(0.188, 0.2, LR * 0.4, LR * 0.9, 0.003, {segs: 64}), M.iris);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      decal(mount, rbox(0.004, LR * 0.36, LR * 0.14, 0.001), M.gunmetal, at(0.202, Math.cos(a) * LR * 0.64, Math.sin(a) * LR * 0.64, a + 0.5));
    }
    put(mount, cylX(LR * 0.32, LR * 0.32, 0.012, 32), M.black, 0.2, 0, 0);
    put(mount, ring(0.196, 0.206, LR * 0.32, LR * 0.4, 0.002, {segs: 48}), M.gunmetal);
    const Rs = LR * 1.35;
    const th = Math.asin((LR * 0.96) / Rs);
    const glass = put(mount, new THREE.SphereGeometry(Rs, 64, 32, 0, Math.PI * 2, 0, th).rotateZ(-Math.PI / 2), M.lensGlass, 0.19 - Rs * Math.cos(th), 0, 0);
    glass.castShadow = false;
    clear.push(glass);
    eyes.push({sw, side: si});
    if (si === 1) anchor('eye', mount, 0.25, 0, 0);
    ex(eg, [0.2, 0.1, 1], 0.3, 0.2, 0.85);
    // three green LEDs in a vertical column just behind the housing
    const ledG = grp(side);
    for (const a of [58, 74, 90]) {
      const p = headPt(0.12, a, 0.004);
      const g = grp(ledG, p.x, p.y, p.z);
      g.rotation.x = a * D2R;
      put(g, new THREE.CylinderGeometry(0.034, 0.036, 0.02, 16), M.black);
      put(g, new THREE.SphereGeometry(0.024, 16, 10), M.led, 0, 0.008, 0);
    }
    if (si === 1) anchor('leds', ledG, 0.33, 0.18, 0.24);
    ex(ledG, [0, 0, 1], 0.14, 0.25, 0.8);
  }

  // ================================================================ torso: eleven bands along the arched spine
  const torso = grp(body);
  const NB = 11;
  const bw = (TX0 - TX1) / NB;
  const gap = 0.02;
  for (let i = 0; i < NB; i++) {
    const xm = TX0 - (i + 0.5) * bw;
    const {cy, hh, ww} = tor(xm);
    const th = Math.atan2(tor(xm + 0.02).cy - tor(xm - 0.02).cy, 0.04);
    const bg = grp(torso, xm, cy, 0);
    bg.rotation.z = th;
    // the black core under the gaps
    const core = grp(bg);
    core.scale.set(1, hh, ww);
    put(core, cylX(0.9, 0.9, bw + 0.012, 40), M.black);
    // the band: a graphite plate over the top and both flanks, a rib on the spine, bolts along both edges
    const shell = grp(bg);
    const pl = grp(shell);
    pl.scale.set(1, hh, ww);
    const w = (bw - gap) / 2;
    put(pl, sweepX(plateP(w, 1.0, 0.14, 0.07, 0.016), {a0: -126 * D2R, a1: 126 * D2R, segs: 48, smooth: 40}), M.armour);
    put(shell, rbox(w * 1.1, 0.07, 0.075, 0.02), M.armourDk, 0, hh + 0.02, 0);
    for (const ad of [40, 80, -40, -80]) {
      const p = onEll(hh, ww, ad * D2R, 0.004);
      for (const xs of [-1, 1]) decal(shell, boltGeo(), M.steel, at(xs * (w - 0.02), p.y, p.z, p.an));
    }
    // the lighter square inlays on the rear flank
    // round 5: four separate squares per side, staggered over bands 6-9, with no black backing plates (round 4's
    // backed squares on adjacent bands read as a stepped grid of 6 to 7)
    const inl = {6: [100], 7: [74], 8: [100], 9: [76]}[i] || [];
    for (const ad of inl) {
      for (const sg of [1, -1]) {
        const p = onEll(hh, ww, sg * ad * D2R, 0.006);
        decal(shell, rbox(0.1, 0.014, 0.1, 0.004), M.inlay, at(0, p.y, p.z, p.an));
      }
    }
    // the belly plate
    const belly = grp(bg);
    const bp = grp(belly);
    bp.scale.set(1, hh, ww);
    put(bp, sweepX(plateP(w * 0.92, 0.98, 0.12, 0.06, 0.012), {a0: 138 * D2R, a1: 222 * D2R, segs: 16, smooth: 40}), M.armourDk);
    if (i === 5) anchor('band', shell, 0, hh, 0);
    ex(shell, [0.1, 1, 0], 0.18 + 0.02 * i, 0.05 + 0.025 * i, 0.55 + 0.025 * i);
    ex(belly, [0, -1, 0], 0.14, 0.1, 0.7);
  }

  // ================================================================ legs
  function buildLeg(Lg) {
    const g = new THREE.Group();
    const upper = grp(g);
    const lower = grp(g);
    const foot = grp(g);
    // upper: a black link in two graphite sleeves, a small piston under it
    put(upper, cylX(0.034, 0.03, Lg.L1, 14), M.black, Lg.L1 / 2, 0, 0);
    put(upper, sweepX(sleeveP(0.08, Lg.L1 * 0.6, 0.058, 0.016), {segs: 28, smooth: 40}), M.armour);
    put(upper, sweepX(sleeveP(Lg.L1 * 0.64, Lg.L1 - 0.08, 0.05, 0.014), {segs: 28, smooth: 40}), M.armourDk);
    put(upper, cylX(0.016, 0.016, Lg.L1 * 0.4, 10), M.black, Lg.L1 * 0.36, -0.06, 0);
    put(upper, cylX(0.007, 0.007, Lg.L1 * 0.3, 8), M.steel, Lg.L1 * 0.66, -0.06, 0);
    // lower: the elbow hub, a thinner link and sleeves
    hubZ(lower, 0.072, 0.1, 5);
    put(lower, cylX(0.03, 0.025, Lg.L2, 14), M.black, Lg.L2 / 2, 0, 0);
    put(lower, sweepX(sleeveP(0.08, Lg.L2 * 0.72, 0.05, 0.014), {segs: 28, smooth: 40}), M.armour);
    put(lower, sweepX(sleeveP(Lg.L2 * 0.76, Lg.L2 - 0.06, 0.042, 0.01), {segs: 28, smooth: 40}), M.armourDk);
    // foot: the wrist hub, a palm block, two opposed bundles of two curved toes reaching down to the surface
    hubZ(foot, 0.05, 0.075, 5);
    put(foot, rbox(0.12, 0.045, 0.075, 0.015), M.armour, 0, -0.03, 0);
    // round 5: each bundle's two toes run close together, thicker, curving down and hooking under at the tip, so the
    // pair reads as one claw gripping the surface (round 4's thin, widely spread spikes read as a crown)
    for (const [sx, len] of [
      [1, 0.2],
      [-1, 0.16],
    ]) {
      put(foot, new THREE.SphereGeometry(0.03, 14, 10), M.black, sx * 0.05, -0.036, 0);
      for (const dz of [-0.017, 0.017]) {
        const pts = [
          [sx * 0.02, -0.03, dz * 0.7],
          [sx * len * 0.45, -0.03, dz],
          [sx * len * 0.82, -0.045, dz * 1.05],
          [sx * len, -FOOT_H + 0.012, dz * 1.05],
          [sx * len * 0.94, -FOOT_H + 0.004, dz],
        ];
        put(foot, taperTube(pts, 0.026, 0.008, 24, 10), M.armourDk);
      }
    }
    return {g, upper, lower, foot};
  }
  const legs = [];
  for (const [si, side] of sides.entries()) {
    LEGS.forEach((Lg, li) => {
      const H = new V3(Lg.hip[0], Lg.hip[1], tor(Lg.hip[0]).ww + 0.03);
      const hub = grp(side, H.x, H.y, H.z);
      hubZ(hub, 0.12, 0.07, 6);
      ex(hub, [0, 0, 1], 0.2, 0.3, 0.85);
      const leg = buildLeg(Lg);
      side.add(leg.g);
      legs.push({side: si, idx: li, name: LEG_NAMES[si * 2 + li], H, L1: Lg.L1, L2: Lg.L2, P: new V3(...Lg.pole).normalize(), ...leg});
      if (si === 1 && li === 0) {
        anchor('hipRF', hub, 0, 0, 0.04);
        anchor('footRF', leg.foot, 0, -0.03, 0.04);
      }
    });
  }

  // ================================================================ tail: 40 segments, shorter and thinner toward the tip
  const tailG = grp(body);
  const segs = [];
  {
    const wts = [];
    let sum = 0;
    for (let i = 0; i < TN; i++) {
      const w = 1 - 0.55 * (i / (TN - 1));
      wts.push(w);
      sum += w;
    }
    for (let i = 0; i < TN; i++) {
      const u = i / (TN - 1);
      const r = 0.105 * (1 - 0.72 * u);
      const ds = (wts[i] / sum) * TL;
      const sg = grp(tailG);
      const zs = grp(sg);
      zs.scale.z = 0.9;
      put(zs, cylX(r * 0.6, r * 0.6, ds * 1.04, 12), M.black, ds / 2, 0, 0);
      put(
        zs,
        sweepX(
          [
            [ds * 0.06, 0],
            [ds * 0.06, r * 0.8],
            [ds * 0.16, r],
            [ds * 0.84, r],
            [ds * 0.94, r * 0.8],
            [ds * 0.94, 0],
          ],
          {segs: 28, smooth: 40},
        ),
        M.armour,
      );
      if (i < TN - 6) decal(sg, rbox(ds * 0.5, r * 0.32, r * 0.55, r * 0.12), M.armourDk, m4.makeTranslation(ds / 2, r * 0.98, 0));
      if (i % 2 === 0 && i < TN - 10) {
        decal(sg, boltGeo(r / 0.08).rotateX(Math.PI / 2), M.steel, m4.makeTranslation(ds / 2, 0, r * 0.88));
        decal(sg, boltGeo(r / 0.08).rotateX(-Math.PI / 2), M.steel, m4.makeTranslation(ds / 2, 0, -r * 0.88));
      }
      segs.push({g: sg, ds});
    }
  }
  anchor('tail', segs[30].g, 0, 0, 0.05);
  flush();

  // ================================================================ pose
  const Dv = new V3();
  const Bv = new V3();
  const Ev = new V3();
  const Wv = new V3();
  const Nv = new V3();
  const Fv = new V3();
  const AX = new V3();
  const AY = new V3();
  const AZ = new V3();
  const mB = new THREE.Matrix4();
  // put obj at `from`, its +x toward `to`, its +z along the leg plane's normal
  const aimSeg = (obj, from, to, nrm) => {
    AX.subVectors(to, from).normalize();
    AZ.copy(nrm).addScaledVector(AX, -nrm.dot(AX)).normalize();
    AY.crossVectors(AZ, AX);
    mB.makeBasis(AX, AY, AZ);
    obj.position.copy(from);
    obj.quaternion.setFromRotationMatrix(mB);
  };
  // 2-bone IK in the leg's plane, the elbow bent toward the pole
  const solve = (lg, F) => {
    const {H, L1, L2, P} = lg;
    Dv.subVectors(F, H);
    const dl = Dv.length() || 1e-6;
    Dv.divideScalar(dl);
    const D = clamp(dl, Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.999);
    const ca = clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1);
    const sa = Math.sqrt(1 - ca * ca);
    Bv.copy(P).addScaledVector(Dv, -P.dot(Dv)).normalize();
    Ev.copy(H).addScaledVector(Dv, L1 * ca).addScaledVector(Bv, L1 * sa);
    Wv.copy(H).addScaledVector(Dv, D);
    Nv.crossVectors(Dv, Bv).normalize();
    aimSeg(lg.upper, H, Ev, Nv);
    aimSeg(lg.lower, Ev, Wv, Nv);
    lg.foot.position.copy(Wv);
  };
  /** @type {(state?: {explode?: number, t?: number, spinT?: number, feet?: number[][] | null, tuck?: number, reach?: number, curl?: number}) => void} */
  const pose = ({explode = 0, t = 0, spinT = t, feet = null, tuck = 0, reach = 1, curl = 1} = {}) => {
    const e = clamp(explode, 0, 1);
    for (const it of X) it.obj.position.copy(it.home).addScaledVector(it.dir, it.dist * ssw(e, it.s, it.f) * reach);
    for (const sp of spinners) sp.obj.rotation.x = sp.rate * spinT;
    // the eyes swivel on their own, as a chameleon's do
    eyes.forEach((ey, i) => ey.sw.rotation.set(0, 0.22 * Math.sin(t * 0.55 + i * 2.1), 0.16 * Math.sin(t * 0.4 + i * 1.3)));
    // the legs: IK to the feet (or the homes), blended toward the tucked spots; out from the flank in the explode
    const kl = ssw(e, 0.35, 0.95);
    for (const lg of legs) {
      const i = lg.side * 2 + lg.idx;
      const f = feet ? feet[i] : legHome(i);
      const tk = legTuck(i);
      Fv.set(lerp(f[0], tk[0], tuck), lerp(f[1], tk[1], tuck), (lg.side === 0 ? -1 : 1) * lerp(f[2], tk[2], tuck));
      lg.g.position.set(0, -0.05 * kl * reach, 0.4 * kl * reach);
      solve(lg, Fv);
    }
    // the tail: integrated from its base, curvature growing toward the tip; the explode opens a gap at every joint
    const kx = ssw(e, 0.3, 0.9) * reach;
    let x = TB[0] - 0.18 * kx;
    let y = TB[1];
    let phi = PHI0;
    let s = 0;
    for (const sg of segs) {
      const sm = s + sg.ds / 2;
      const k = curl * (TKA + TKB * (sm / TL) ** 3) + 0.12 * Math.sin(t * 1.1 - sm * 2.2) * (0.4 + sm / TL);
      const mid = phi + 0.5 * k * sg.ds;
      sg.g.position.set(x, y, 0);
      sg.g.rotation.z = mid;
      const step = sg.ds * (1 + 0.5 * kx);
      x += Math.cos(mid) * step;
      y += Math.sin(mid) * step;
      phi += k * sg.ds;
      s += sg.ds;
    }
  };
  pose({});

  root.traverse((o) => {
    if (o.isMesh && o.material && (o.material.transparent || o.material.transmission > 0)) {
      o.castShadow = false;
      if (!clear.includes(o)) clear.push(o);
    }
  });
  return {root, pose, clear, M, anchors, legs, tail: segs};
}
