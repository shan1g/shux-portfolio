// The SHUX chrome spider's still and teardown, on the cutaway kit's runtime (window.SIM.render(t) for capture).
// The rig is the kit's robotic tarantula rebuilt in polished chrome (./spider.js, ./parts.js). The stage is dark sci-fi
// after the lighting references images (1) and (2): an amber backlight from above and behind through red haze, a
// rose-magenta fill, a hot red-orange glow off the floor in front, a dark glossy floor, bloom on the red glows.
// ?explode=0..1 pins the teardown; ?exposure= ?bloom= ?glow= ?az= ?el= ?d= tune the look and the camera.
// Timeline: assembled 0-3 s, coming apart 3-6.5 s, held apart, back together 9-11.5 s.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {runSim} from 'cutaway-kit/runtime.js';
import {buildSpider, FLOOR_Y} from './spider.js';

const DURATION = 12;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};
const explodeAt = (t) => sstep((t - 3) / 3.5) * (1 - sstep((t - 9) / 2.5));

// glowing cards round a black void, prefiltered for the chrome (or the lenses) to reflect
// band: an optional soft neutral ring round the horizon [colour, strength, height, y], so every chrome face catches a
// silver gradient instead of the black void (round 2)
// dome: an optional studio sphere [top, horizon, bottom, strength] with a vertical gradient, so chrome mirrors a bright
// neutral world and reads silver (rounds 1-4 mirrored a near-black void and came out black with warm patches)
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

runSim(
  {duration: DURATION, fps: 60, theme: 'dark', hud: {enabled: false, title: 'chrome spider', subtitle: ''}, director: {enabled: false}, watermark: ''},
  async ({canvas, capture}) => {
    const q = new URLSearchParams(location.search);
    const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
    const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = num('exposure', 0.88);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#100709', 0.03);
    // what the chrome reflects: neutral softboxes for the silver streaks (round 1's all-warm cards turned the chrome
    // orange), thin amber, rose and red accents for the colour, black everywhere else
    scene.environment = cardEnv(
      renderer,
      '#060607',
      [
        // a big neutral softbox overhead, a hot white card front-right (the clipped streaks), grey strips on both sides:
        // the silver
        // round 6: both dimmer, so the dome shows streaks instead of a white bloom
        // round 7: partway back up (round 6 lost the clipped streaks); the bloom threshold stays high
        [18, 10, [0.1, 1, 0.15], '#fff6ee', num('top', 2.7)],
        [6, 4, [0.8, 0.45, 0.35], '#ffffff', num('card', 5)],
        [4, 10, [0.55, 0.2, -0.8], '#d8dce2', 2.4],
        [4, 9, [0.35, 0.35, 0.87], '#e8e8ec', 1.8],
        // the warm accents: an amber strip behind, a rose strip on the fill side, a dim red band low in front
        // round 5: the amber is a thin strip low behind, so it only rims the top edges (round 4's high strip painted
        // a peach blob on every dome plate)
        [14, 0.9, [-0.95, 0.16, 0.05], '#ffb070', 6],
        [1.6, 12, [-0.3, 0.25, 0.9], '#ff4a9a', 2.2],
        [14, 1.6, [0.4, -0.5, 0], '#ff4a14', 1.0],
        // round 7: a dim warm card where the floor's mirror ray points from the hero camera (up and away from it), so
        // the floor catches a warm sheen instead of reading black
        [16, 5, [-0.62, 0.62, -0.45], '#ff7a48', num('sheen', 1.4)],
      ],
      0.02,
      ['#c9ccd2', 1.3, 14, 1.5],
      ['#d4d6da', '#7a7d82', '#141416', num('dome', 1.0)],
    );
    scene.environmentIntensity = num('env', 1.0);
    // the lenses see a darker world with a few hard cards, so they read deep black with crisp highlights
    const lensEnv = cardEnv(
      renderer,
      '#050303',
      [
        [10, 6, [-0.2, 1, 0.2], '#ffb070', 2.5],
        [1.6, 12, [-0.85, 0.3, 0.45], '#ff3a78', 1.2],
        [3.2, 2.2, [0.42, 0.62, 0.66], '#ffe8d8', 4],
      ],
      0.01,
    );

    // the amber key from above and behind (the shadows), a rose-magenta fill on the other side, a weak warm front light
    // so the face reads, a dim red hemisphere
    const key = new THREE.DirectionalLight('#ffa860', 4.0);
    key.position.set(-5, 7, 1.5);
    key.castShadow = true;
    Object.assign(key.shadow.camera, {left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25});
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    scene.add(key, key.target);
    const rose = new THREE.DirectionalLight('#ff4aa0', 2.4);
    rose.position.set(1.5, 1.2, -5);
    // round 4: the camera-side fill is rose-magenta (the rose light above only reaches the far side)
    const front = new THREE.DirectionalLight('#ff6ab0', 1.3);
    front.position.set(6, 3, 3);
    scene.add(rose, front, new THREE.HemisphereLight('#3a1430', '#050204', 0.5));

    // the floor: dark glossy metal, a red-orange glow pooled on it in front of the spider, a lamp there lighting the
    // underside from below
    // the floor fades out radially into the haze backdrop, so its far edge never reads as a hard band (round 1)
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
    // round 7: centred on the front feet (x ~2.0), so the glow reads as a pool on the floor
    pool.position.set(1.9, FLOOR_Y + 0.004, 0);
    scene.add(pool);
    const under = new THREE.PointLight('#ff4a1a', 12 * glowK, 6, 2);
    under.position.set(1.9, FLOOR_Y + 0.25, 0);
    scene.add(under);

    const spider = buildSpider();
    scene.add(spider.root);
    // the faint floor reflection: a second spider mirrored about the floor (lamps stripped, no shadows), seen through
    // the floor's slight transparency and fading into the fog; ?reflect=0 drops it
    const mirror = num('reflect', 1) ? buildSpider() : null;
    if (mirror) {
      mirror.root.scale.y = -1;
      mirror.root.position.y = 2 * FLOOR_Y;
      const lamps = [];
      mirror.root.traverse((o) => {
        if (o.isLight) lamps.push(o);
        if (o.isMesh) o.castShadow = o.receiveShadow = false;
      });
      for (const l of lamps) l.parent.remove(l);
      scene.add(mirror.root);
    }
    for (const s of [spider, mirror]) {
      if (!s) continue;
      for (const m of [s.M.lens, s.M.lensGlass]) {
        if (!m) continue;
        m.envMap = lensEnv;
        m.needsUpdate = true;
      }
    }

    const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 80);
    scene.add(camera);
    // the haze backdrop rides on a far plane in front of the camera: near black below, red-orange haze toward the top
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
    // target, azimuth from +x (the face) toward +z, elevation, distance
    // round 6: higher and more three-quarter, the target lowered so the floor and its glow are in frame
    // round 7: closer (round 6's spider shrank to x 0.24-0.75), the target a little higher so the near front leg stops
    // at the bottom edge
    const CAM = {tx: num('tx', -0.25), ty: num('ty', -0.35), tz: num('tz', -0.2), az: num('az', 0.62), el: num('el', 0.72), d: num('d', 8.3)};
    const place = () => {
      const {tx, ty, tz, az, el, d} = CAM;
      camera.position.set(tx + d * Math.cos(el) * Math.cos(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.sin(az));
      camera.lookAt(tx, ty, tz);
    };
    place();

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 4}));
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1600, 900), num('bloom', 0.3), 0.4, num('bthresh', 1.6));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

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
    window.CHROME = {spider, mirror, camera, scene, CAM, bloom, key, rose, front, under, pool};

    return {
      resize,
      render(t) {
        const ex = q.has('explode') ? Number(q.get('explode')) : explodeAt(t);
        spider.pose({t, spinT: t, explode: ex});
        if (mirror) mirror.pose({t, spinT: t, explode: ex});
        place();
        composer.render();
        return {};
      },
    };
  },
);
