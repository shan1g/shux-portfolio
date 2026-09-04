import type { Theme } from "@/components/theme/ThemeProvider";
import type { Gpu, Surface } from "vgpu";
import { surface } from "vgpu";
import { loadHeroGlassAssets, type HeroGlassAssets } from "./hero-glass-assets";
import {
  createLedBackdrop,
  inactiveLedBrush,
  type LedBackdrop,
} from "./ledBackdrop/createLedBackdrop";
import { pointerToLedBrush } from "./ledBackdrop/pointerBrush";
import type { TriangleLedMode } from "./ledBackdrop/types";
import {
  createCameraControls,
  createHeroFractalScene,
  renderHeroFractalScene,
  resizeHeroFractalScene,
  setHeroFractalSceneSettings,
  type HeroFractalScene,
} from "./scene";
import {
  applyThemeToHeroGlass,
  HERO_FRACTAL_CAMERA,
  HERO_FRACTAL_GLASS,
  HERO_FRACTAL_MATERIAL,
  HERO_ORB_MATERIAL,
  type HeroFractalMaterial,
} from "./settings";

// Matches the vgpu glass-fractal example: a fixed-duration eased transition
// between the two authored endpoints rather than a scroll-linear scrub.
const SPHERE_MORPH_DURATION_MS = 1040;

interface RendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly pointerElement?: HTMLElement | null;
  readonly theme?: Theme;
}

export interface HeroGlassRenderer {
  readonly ready: Promise<void>;
  setSphereMixDirect(value: number): void;
  setSphereMixTarget(value: number): void;
  setLedModeDirect(mode: TriangleLedMode): void;
  setAudioEnergyDirect(value: number): void;
  applyTheme(theme: Theme): void;
  dispose(): void;
}

interface MutableHeroFractalMaterial {
  baseColor: [number, number, number];
  roughness: number;
  diffuseStrength: number;
  specularStrength: number;
  ambientStrength: number;
}

function copyMaterial(
  material: Readonly<HeroFractalMaterial>,
): MutableHeroFractalMaterial {
  return {
    baseColor: [...material.baseColor],
    roughness: material.roughness,
    diffuseStrength: material.diffuseStrength,
    specularStrength: material.specularStrength,
    ambientStrength: material.ambientStrength,
  };
}

function cssSizeOf(canvas: HTMLCanvasElement, dpr: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width || canvas.clientWidth || canvas.width / dpr),
    height: Math.max(1, rect.height || canvas.clientHeight || canvas.height / dpr),
    dpr,
  };
}

export function createRenderer(options: RendererOptions): HeroGlassRenderer {
  let disposed = false;
  let failureStarted = false;
  const abort = new AbortController();
  let gpu: Gpu | undefined;
  let canvasSurface: Surface | undefined;
  let coreScene: HeroFractalScene | undefined;
  let ledBackdrop: LedBackdrop | undefined;
  let assets: HeroGlassAssets | undefined;
  let observer: ResizeObserver | undefined;
  let resizeFrame = 0;
  let animationFrame = 0;
  const orbEpoch = performance.now();
  let orbTime = 0;
  // heroFractalSphereMix picks its vertex stagger profile from the SIGN of the
  // mix: the full tip-led stagger outbound, only a hint of it on the way back.
  // Pinning this to 1 replayed the outbound stagger in reverse, so the tips
  // retracted first and the body trailed. It has to persist across frames
  // because drawHero runs on every rAF tick, not only when the mix changes.
  let morphDirection = 1;
  // The shape is only ever driven to an endpoint (fractal or orb) and eased
  // there over a fixed duration, as in the vgpu example. Scroll picks the
  // endpoint; this owns the transition between them.
  let morphStartTime = 0;
  let morphStartMix = HERO_FRACTAL_GLASS.sphereMix;
  let morphTargetMix = HERO_FRACTAL_GLASS.sphereMix;
  let morphActive = false;
  let isCanvasVisible = true;
  let visibilityObserver: IntersectionObserver | undefined;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerCurrentX = 0;
  let pointerCurrentY = 0;
  let lastPointerEvent: PointerEvent | null = null;
  let lastDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  const fractalMaterial = copyMaterial(HERO_FRACTAL_MATERIAL);
  const orbMaterial = copyMaterial(HERO_ORB_MATERIAL);
  const glass = {
    ...HERO_FRACTAL_GLASS,
    absorption: [...HERO_FRACTAL_GLASS.absorption] as [number, number, number],
    environmentRotation: [...HERO_FRACTAL_GLASS.environmentRotation] as [
      number,
      number,
      number,
    ],
  };
  const cameraControls = createCameraControls(HERO_FRACTAL_CAMERA);
  const pointerElement = options.pointerElement ?? options.canvas;

  const updateLedBrush = () => {
    if (!ledBackdrop) return;
    if (lastPointerEvent) {
      ledBackdrop.setBrush(
        pointerToLedBrush(
          lastPointerEvent.clientX,
          lastPointerEvent.clientY,
          pointerElement,
        ),
      );
      return;
    }
    ledBackdrop.setBrush(inactiveLedBrush());
  };

  // Advances the eased endpoint-to-endpoint morph. This renderer already runs a
  // continuous rAF loop while the canvas is visible, so the morph rides that
  // clock instead of the example's dedicated morph frame.
  const advanceSphereMorph = (time: number) => {
    if (!morphActive) return;
    const progress = Math.min(
      1,
      Math.max(0, (time - morphStartTime) / SPHERE_MORPH_DURATION_MS),
    );
    // easeOutQuart, as in the example.
    const eased = 1 - (1 - progress) ** 4;
    glass.sphereMix = morphStartMix + (morphTargetMix - morphStartMix) * eased;
    if (progress >= 1) {
      glass.sphereMix = morphTargetMix;
      morphActive = false;
    }
  };

  const drawHero = () => {
    if (disposed || !gpu || !canvasSurface || !coreScene || !assets || !ledBackdrop)
      return;

    const lerp = Math.min(1, Math.max(0.001, cameraControls.mouseLerp));
    pointerCurrentX += (pointerTargetX - pointerCurrentX) * lerp;
    pointerCurrentY += (pointerTargetY - pointerCurrentY) * lerp;

    setHeroFractalSceneSettings(coreScene, assets, canvasSurface.size, {
      camera: HERO_FRACTAL_CAMERA,
      fractalMaterial,
      orbMaterial,
      glass,
      time: orbTime,
      view: {
        ...cameraControls,
        pointer: [pointerCurrentX, pointerCurrentY],
      },
      morphDirection,
      reflectionDebug: false,
    });

    renderHeroFractalScene(gpu, canvasSurface, coreScene, {
      ledBackdrop,
      time: orbTime,
    });
  };

  const renderHero = () => {
    try {
      drawHero();
    } catch (error) {
      fail(error);
    }
  };

  const stopAnimation = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const animate = (time: number) => {
    animationFrame = 0;
    if (disposed || !isCanvasVisible || document.hidden) return;
    orbTime = (time - orbEpoch) * 0.001;
    advanceSphereMorph(time);
    updateLedBrush();
    renderHero();
    animationFrame = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (!animationFrame && isCanvasVisible && !document.hidden) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  const requestRender = () => {
    startAnimation();
  };

  /** Snaps to a mix with no transition, cancelling any morph in flight. */
  const setSphereMixDirect = (value: number) => {
    const nextMix = Math.min(1, Math.max(0, value));
    if (nextMix === glass.sphereMix && !morphActive) return;
    morphDirection = nextMix >= glass.sphereMix ? 1 : -1;
    morphActive = false;
    morphStartMix = nextMix;
    morphTargetMix = nextMix;
    glass.sphereMix = nextMix;
    requestRender();
  };

  /** Eases to an endpoint from wherever the shape currently is. */
  const setSphereMixTarget = (value: number) => {
    const nextMix = Math.min(1, Math.max(0, value));
    // Already there, or already on the way — restarting would reset the easing
    // and stall the morph while scroll keeps re-emitting the same endpoint.
    if (nextMix === morphTargetMix) return;
    morphDirection = nextMix >= glass.sphereMix ? 1 : -1;
    morphStartMix = glass.sphereMix;
    morphTargetMix = nextMix;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      morphActive = false;
      glass.sphereMix = nextMix;
      requestRender();
      return;
    }

    morphStartTime = performance.now();
    morphActive = true;
    requestRender();
  };

  const setLedModeDirect = (mode: TriangleLedMode) => {
    ledBackdrop?.setLedMode(mode);
    requestRender();
  };

  const setAudioEnergyDirect = (value: number) => {
    if (!ledBackdrop) return;
    ledBackdrop.setAudioEnergy(value);
    requestRender();
  };

  const applyTheme = (theme: Theme) => {
    applyThemeToHeroGlass(theme, fractalMaterial, orbMaterial, glass);
    ledBackdrop?.applyTheme(theme);
    requestRender();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    lastPointerEvent = event;
    const rect = pointerElement.getBoundingClientRect();
    pointerTargetX = Math.min(
      1,
      Math.max(-1, ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1),
    );
    pointerTargetY = Math.min(
      1,
      Math.max(-1, ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1),
    );
    requestRender();
  };

  const resetPointer = () => {
    lastPointerEvent = null;
    pointerTargetX = 0;
    pointerTargetY = 0;
    ledBackdrop?.setBrush(inactiveLedBrush());
    requestRender();
  };

  const onPointerOut = (event: PointerEvent) => {
    if (event.relatedTarget === null) resetPointer();
  };

  const onDocumentVisibilityChange = () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  };

  const resizeAndDraw = () => {
    resizeFrame = 0;
    if (disposed || !canvasSurface) return;
    try {
      const rect = options.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvasSurface.resize([
        Math.max(1, Math.round(rect.width * dpr)),
        Math.max(1, Math.round(rect.height * dpr)),
      ]);
      const css = cssSizeOf(options.canvas, canvasSurface.dpr);
      ledBackdrop?.rebuild(css);
      if (coreScene) resizeHeroFractalScene(coreScene, canvasSurface.size);
      drawHero();
    } catch (error) {
      fail(error);
    }
  };

  const requestResize = () => {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(resizeAndDraw);
  };

  const onWindowResize = () => {
    if (window.devicePixelRatio === lastDpr) return;
    lastDpr = window.devicePixelRatio;
    requestResize();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    stopAnimation();
    abort.abort();
    observer?.disconnect();
    visibilityObserver?.disconnect();
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerout", onPointerOut);
    window.removeEventListener("pointerleave", resetPointer);
    window.removeEventListener("blur", resetPointer);
    document.removeEventListener(
      "visibilitychange",
      onDocumentVisibilityChange,
    );
    ledBackdrop?.destroy();
    gpu?.dispose();
  };

  const fail = (error: unknown): never => {
    failureStarted = true;
    try {
      dispose();
    } catch {
      // A cleanup failure must not hide the rendering failure.
    }
    throw error;
  };

  const initialize = async () => {
    const { init } = await import("vgpu");
    if (disposed) return;
    const nextGpu = await init();
    if (disposed) {
      nextGpu.dispose();
      return;
    }
    gpu = nextGpu;
    canvasSurface = surface(gpu, options.canvas, { dpr: [1, 2] });
    const css = cssSizeOf(options.canvas, canvasSurface.dpr);
    ledBackdrop = createLedBackdrop(gpu, canvasSurface.format, css);
    const loadedAssets = await loadHeroGlassAssets(gpu, abort.signal);
    if (disposed) return;
    assets = loadedAssets;
    const loadedScene = await createHeroFractalScene(
      gpu,
      canvasSurface,
      assets,
      ledBackdrop.floorTarget,
      "homepage-light",
    );
    if (disposed) return;
    coreScene = loadedScene;
    await ledBackdrop.prewarm();

    if (options.theme) applyTheme(options.theme);

    observer = new ResizeObserver(requestResize);
    observer.observe(options.canvas);
    visibilityObserver = new IntersectionObserver(([entry]) => {
      isCanvasVisible = entry?.isIntersecting ?? false;
      if (isCanvasVisible) startAnimation();
      else stopAnimation();
    });
    visibilityObserver.observe(options.canvas);
    window.addEventListener("resize", onWindowResize);
    // The pointer host is a full-viewport `pointer-events: none` layer, so it
    // never receives pointer events itself. Listen on the window and keep using
    // the element only for rect-relative normalisation.
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("pointerleave", resetPointer);
    window.addEventListener("blur", resetPointer);
    document.addEventListener("visibilitychange", onDocumentVisibilityChange);
    resizeAndDraw();
    startAnimation();
  };

  const ready = initialize().catch((error: unknown) => {
    if (failureStarted) throw error;
    if (disposed) return;
    fail(error);
  });

  return {
    ready,
    setSphereMixDirect,
    setSphereMixTarget,
    setLedModeDirect,
    setAudioEnergyDirect,
    applyTheme,
    dispose,
  };
}
