// The SHUX robotic chameleon's still and teardown, on the cutaway kit's runtime (window.SIM.render(t) for capture).
// The stage is the chrome spider's (cutaway-ref/chrome/main.js): an amber backlight through red haze, a rose fill, a
// warm glow pooled on a dark glossy floor, bloom on the glows. The chameleon is turned half round (root.rotation.y = pi)
// so its head points left in frame, as in the reference.
// ?explode=0..1 pins the teardown; ?curl= the tail's curl; ?exposure= ?bloom= ?glow= ?az= ?el= ?d= tune the look.
// ?tour=0 holds the still's camera through the film; a pinned ?explode= holds it too.
// The film (timeline.json, which score.py reads as well): assembled until `head`, coming apart until `exploded` (the
// head and the casque first, then the eyes and the LEDs, then the legs and the tail, by each part's window in
// chameleon.js), held apart, back together from `assemble` until `hero`. Every beat has its own camera (SHOTS below);
// before `head` it is the approved still's, so the round 6 still at 1.5 s is unchanged.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {runSim} from 'cutaway-kit/runtime.js';
import {buildChameleon, FLOOR_Y} from './chameleon.js';
import TL from './timeline.json';

const BEAT = Object.fromEntries(TL.script.map((b) => [b.act, b.t]));
const DURATION = TL.duration;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};
const explodeAt = (t) =>
  sstep((t - BEAT.head) / (BEAT.exploded - BEAT.head)) * (1 - sstep((t - BEAT.assemble) / (BEAT.hero - BEAT.assemble)));

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const radial = (g, x, y, r, c) => {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, c);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
};

// glowing cards round a dark void, prefiltered for the armour and the lenses to reflect (the spider stage's function)
function cardEnv(renderer, bg, cards, sigma, band = null, dome = null) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(bg);
  if (dome) {
    const [top, mid, bot, k] = dome;
    const map = canvasTex(4, 256, (g, w, hh) => {
      const lin = g.createLinearGradient(0, 0, 0, hh);
      lin.addColorStop(0, top);
      lin.addColorStop(0.44, mid);
      lin.addColorStop(0.56, mid);
      lin.addColorStop(1, bot);
      g.fillStyle = lin;
      g.fillRect(0, 0, w, hh);
    });
    env.add(new THREE.Mesh(new THREE.SphereGeometry(19, 48, 24), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(k), map, side: THREE.BackSide})));
  }
  if (band) {
    const [col, k, h, y] = band;
    const map = canvasTex(4, 256, (g, w, hh) => {
      const lin = g.createLinearGradient(0, 0, 0, hh);
      lin.addColorStop(0, '#000');
      lin.addColorStop(0.5, '#fff');
      lin.addColorStop(1, '#000');
      g.fillStyle = lin;
      g.fillRect(0, 0, w, hh);
    });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, h, 64, 1, true), new THREE.MeshBasicMaterial({color: new THREE.Color(col).multiplyScalar(k), map, side: THREE.BackSide}));
    m.position.y = y;
    env.add(m);
  }
  for (const [w, h, dir, col, k] of cards) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide}));
    m.position.copy(new THREE.Vector3(...dir).normalize().multiplyScalar(15));
    m.lookAt(0, 0, 0);
    env.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, sigma).texture;
  pm.dispose();
  return tex;
}

runSim(
  {duration: DURATION, fps: 60, theme: 'dark', hud: {enabled: false, title: 'chameleon', subtitle: ''}, director: {enabled: false}, watermark: ''},
  async ({canvas, capture}) => {
    const q = new URLSearchParams(location.search);
    // capture.mjs opens the page without a query string: --config {"params": {...}} feeds the same keys
    for (const [k, v] of Object.entries((window.__SIM_CONFIG && window.__SIM_CONFIG.params) || {})) if (!q.has(k)) q.set(k, String(v));
    const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
    const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = num('exposure', 0.95);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#100709', 0.03);
    // the spider stage's environment: neutral softboxes for the edge lines, amber, rose and red accents
    scene.environment = cardEnv(
      renderer,
      '#060607',
      [
        [18, 10, [0.1, 1, 0.15], '#fff6ee', num('top', 2.7)],
        [6, 4, [0.8, 0.45, 0.35], '#ffffff', num('card', 2.6)],
        [4, 10, [0.55, 0.2, -0.8], '#d8dce2', 2.4],
        [4, 9, [0.35, 0.35, 0.87], '#e8e8ec', 1.8],
        [14, 0.9, [-0.95, 0.16, 0.05], '#ffb070', 6],
        [1.6, 12, [-0.3, 0.25, 0.9], '#ff4a9a', 2.2],
        [14, 1.6, [0.4, -0.5, 0], '#ff4a14', 1.0],
        [16, 5, [-0.62, 0.62, -0.45], '#ff7a48', num('sheen', 1.4)],
      ],
      0.02,
      ['#c9ccd2', 1.3, 14, 1.5],
      ['#d4d6da', '#7a7d82', '#141416', num('dome', 1.0)],
    );
    scene.environmentIntensity = num('env', 1.0);
    // the lenses see a darker world with a few hard cards, so they read deep with one crisp window highlight
    const lensEnv = cardEnv(
      renderer,
      '#050303',
      [
        // round 2: a cool world, so the lens reads blue-black with one white window (round 1's amber cards turned it brown)
        [10, 6, [-0.2, 1, 0.2], '#8fb0c8', 1.6],
        [1.6, 12, [-0.85, 0.3, 0.45], '#5a7890', 0.8],
        [3.2, 2.2, [0.42, 0.62, 0.66], '#eef6ff', 4],
      ],
      0.01,
    );

    // ?key= ?rose= ?front= set the three lights' intensities (round 2: used to find the source of the shoulder flares)
    const key = new THREE.DirectionalLight('#ffa860', num('key', 4.0));
    key.position.set(-5, 7, 1.5);
    key.castShadow = true;
    Object.assign(key.shadow.camera, {left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25});
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    scene.add(key, key.target);
    // round 3: dimmer and less saturated, kept as a rim light (at 2.4 it was the source of the shoulder and elbow flares)
    const rose = new THREE.DirectionalLight('#d86aa0', num('rose', 1.1));
    // round 5: ?rosex= ?rosey= ?rosez= place it. At y 1.2 (13 degrees up, straight behind) its mirror reflection on
    // the glossy floor sat right behind the body, at the camera's own 14 degrees: round 4's magenta shoulder flare.
    // Raised to y 4.5 (about 41 degrees up), it stays a rim light from above and its floor reflection drops out of frame
    rose.position.set(num('rosex', 1.5), num('rosey', 4.5), num('rosez', -5));
    // round 2: a dim neutral fill (round 1's pink fill tinted the armour rose)
    const front = new THREE.DirectionalLight('#c8b8c0', num('front', 0.6));
    front.position.set(6, 3, 3);
    scene.add(rose, front, new THREE.HemisphereLight('#24202a', '#050405', 0.5));

    const fade = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      const rg = g.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2);
      rg.addColorStop(0, '#fff');
      rg.addColorStop(1, '#000');
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({color: '#4a4044', metalness: 0.9, roughness: 0.24, envMapIntensity: num('floorenv', 2.0), alphaMap: fade, transparent: true, opacity: num('floorop', 0.4), depthWrite: true}),
    );
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    scene.add(floor);
    const glowK = num('glow', 1);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 4.5).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: canvasTex(512, 512, (g, w, h) => radial(g, w / 2, h / 2, w / 2, 'rgba(255,110,40,1)')),
        transparent: true,
        opacity: 0.85 * glowK,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    pool.position.set(0.1, FLOOR_Y + 0.004, 0.3);
    scene.add(pool);
    // round 2: dimmer and behind the body, away from the near front leg (round 1 blew it out)
    const under = new THREE.PointLight('#ff4a1a', 3.5 * glowK, 6, 2);
    under.position.set(0.1, FLOOR_Y + 0.15, -0.1);
    scene.add(under);

    const cham = buildChameleon();
    cham.root.rotation.y = Math.PI;
    scene.add(cham.root);
    // the faint floor reflection: a second chameleon mirrored about the floor (no shadows); ?reflect=0 drops it
    const mirror = num('reflect', 1) ? buildChameleon() : null;
    if (mirror) {
      mirror.root.rotation.y = Math.PI;
      mirror.root.scale.y = -1;
      mirror.root.position.y = 2 * FLOOR_Y;
      mirror.root.traverse((o) => {
        if (o.isMesh) o.castShadow = o.receiveShadow = false;
      });
      scene.add(mirror.root);
    }
    for (const s of [cham, mirror]) {
      if (!s) continue;
      for (const m of [s.M.lens, s.M.lensGlass]) {
        m.envMap = lensEnv;
        m.needsUpdate = true;
      }
    }

    const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 80);
    scene.add(camera);
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        fog: false,
        map: canvasTex(1024, 576, (g, w, h) => {
          const lin = g.createLinearGradient(0, 0, 0, h);
          lin.addColorStop(0, '#4a1a12');
          lin.addColorStop(0.35, '#22100f');
          lin.addColorStop(0.7, '#0c0709');
          lin.addColorStop(1, '#050405');
          g.fillStyle = lin;
          g.fillRect(0, 0, w, h);
          g.globalCompositeOperation = 'lighter';
          radial(g, w * 0.5, -h * 0.05, h * 0.85, 'rgba(255,140,90,0.26)');
          radial(g, w * 0.2, h * 0.2, h * 0.5, 'rgba(180,50,110,0.08)');
          radial(g, w * 0.82, h * 0.25, h * 0.45, 'rgba(255,90,50,0.12)');
        }),
      }),
    );
    back.position.z = -40;
    camera.add(back);
    // world frame (the chameleon turned half round): the head is at -x, its left side faces +z. The camera sits on +z,
    // a little toward the head and about 14 degrees up, as in the reference.
    const CAM = {tx: num('tx', 0.25), ty: num('ty', -0.25), tz: num('tz', 0), az: num('az', 1.92), el: num('el', 0.24), d: num('d', 5.8)};
    const place = () => {
      const {tx, ty, tz, az, el, d} = CAM;
      camera.position.set(tx + d * Math.cos(el) * Math.cos(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.sin(az));
      camera.lookAt(tx, ty, tz);
    };
    place();

    // One camera per beat, aimed at its own part (world frame as above: the head at -x, the near flank at +z). Each shot
    // eases in from the last over MOVE seconds, then pushes in (push: the share of d closed over its hold) and orbits
    // (radians over its hold). The first is the still's own camera, held, so frames before `head` match the still.
    const BASE = {...CAM};
    const shot = (t, tx, ty, tz, az, el, d, push = 0, orbit = 0) => ({t, tx, ty, tz, az, el, d, push, orbit});
    // Each camera starts its move LEAD seconds before its beat, so it has arrived while its part is still moving (the
    // parts' windows run ahead of the beats). The still's camera holds until head - LEAD, well after the still's 1.5 s.
    // No shot looks down more than about 17 degrees: the rose rim light sits about 41 degrees up behind the body, and
    // a steeper camera from the front sees its reflection spread over the glossy floor as a magenta glow (a 26 degree
    // exploded shot did).
    const LEAD = 0.6;
    const SHOTS = [
      shot(0, BASE.tx, BASE.ty, BASE.tz, BASE.az, BASE.el, BASE.d),
      // the head sliding off forward and the casque lifting: from ahead of the snout, a little high
      shot(BEAT.head - LEAD, -0.9, 0.05, 0.15, 2.55, 0.3, 3.8, 0.08, -0.12),
      // the near eye backing out of the head: close, nearly side-on, at eye height
      shot(BEAT.eye - LEAD, -0.95, 0.1, 0.4, 1.78, 0.14, 2.6, 0.1, 0.1),
      // the legs swinging out from the flank and the tail opening: low, from behind the hip
      shot(BEAT.legs - LEAD, 0.35, -0.35, 0.35, 1.15, 0.1, 4.0, 0.06, 0.15),
      // the whole teardown hanging apart: wide, a little above the still's height, a slow orbit
      shot(BEAT.exploded - LEAD, 0.1, -0.2, 0.1, 2.15, 0.22, 7.6, 0.05, -0.3),
      // going back together: from the other quarter
      shot(BEAT.assemble - LEAD, 0.15, -0.22, 0, 1.55, 0.2, 6.4, 0.04, 0.2),
      // whole again: the still's own angle, pushed in a touch
      shot(BEAT.hero - LEAD, BASE.tx, BASE.ty, BASE.tz, BASE.az, BASE.el, BASE.d * 0.96, 0.04, 0),
    ];
    const MOVE = 1.1;
    const KEYS = ['tx', 'ty', 'tz', 'az', 'el', 'd'];
    const drifted = (s, u) => ({...s, d: s.d * (1 - s.push * u), az: s.az + s.orbit * u});
    const shotAt = (t) => {
      let i = 0;
      while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t) i++;
      const cur = SHOTS[i];
      const end = i + 1 < SHOTS.length ? SHOTS[i + 1].t : DURATION;
      const now = drifted(cur, sstep((t - cur.t) / (end - cur.t)));
      if (!i) return now;
      const from = drifted(SHOTS[i - 1], 1);
      const k = sstep((t - cur.t) / MOVE);
      return Object.fromEntries(KEYS.map((key) => [key, from[key] + (now[key] - from[key]) * k]));
    };
    const tour = num('tour', 1) && !q.has('explode');

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 4}));
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1600, 900), num('bloom', 0.3), 0.4, num('bthresh', 2.2));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ?mask=1: the chameleon alone, flat white on black, for the dark-share mask (no floor, glow, haze or reflection)
    if (q.has('mask')) {
      scene.overrideMaterial = new THREE.MeshBasicMaterial({color: '#ffffff'});
      scene.background = new THREE.Color('#000000');
      scene.fog = null;
      for (const o of [floor, pool, back, mirror && mirror.root]) if (o) o.visible = false;
      bloom.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
    }

    // ?ids=1: every chameleon material drawn as one flat colour (the IDS table, sRGB), for tracing a highlight to its part
    // (round 3: the shoulder flare survived the dimmer rose light and the satin gunmetal). darkshare.mjs glare reads it.
    const IDS = {armour: '#ff0000', armourDk: '#00ff00', inlay: '#0000ff', black: '#ffff00', gunmetal: '#ff00ff', steel: '#00ffff', lens: '#ffffff', iris: '#ff8000', lensGlass: '#8000ff', led: '#00ff80'};
    if (q.has('ids')) {
      const flat = new Map(
        Object.entries(IDS)
          .filter(([n]) => cham.M[n])
          .map(([n, hex]) => [cham.M[n], new THREE.MeshBasicMaterial({color: new THREE.Color().setStyle(hex)})]),
      );
      cham.root.traverse((o) => {
        if (o.isMesh && flat.has(o.material)) o.material = flat.get(o.material);
      });
      scene.background = new THREE.Color('#000000');
      scene.fog = null;
      for (const o of [floor, pool, back, mirror && mirror.root]) if (o) o.visible = false;
      bloom.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
    }

    const resize = () => {
      const pr = capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(innerWidth, innerHeight);
      composer.setPixelRatio(pr);
      composer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      const h = 2 * 40 * Math.tan((camera.fov * Math.PI) / 360) * 1.08;
      back.scale.set(h * camera.aspect, h, 1);
    };
    resize();
    window.CHAM = {cham, mirror, camera, scene, CAM, bloom, key, rose, front, under, pool, shotAt};

    const curl = num('curl', 1);
    return {
      resize,
      render(t) {
        const ex = q.has('explode') ? Number(q.get('explode')) : explodeAt(t);
        cham.pose({t, spinT: t, explode: ex, curl});
        if (mirror) mirror.pose({t, spinT: t, explode: ex, curl});
        if (tour) Object.assign(CAM, shotAt(t));
        place();
        composer.render();
        return {};
      },
    };
  },
);
