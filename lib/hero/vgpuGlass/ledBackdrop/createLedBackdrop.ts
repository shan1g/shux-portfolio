import type { Theme } from "@/components/theme/ThemeProvider";
import type { Frame, Gpu, Target } from "vgpu";
import { target } from "vgpu";
import {
  createHeroRenderer,
  type HeroRendererCss,
} from "./scene-renderer";
import { heroStateForActiveClick } from "./sim-sizing";
import { DEFAULT_BRUSH, setHeroLedTheme, type BrushState } from "./settings";
import { brushState } from "./sim-sizing";
import type { TriangleLedMode } from "./types";
import { isTriangleLedMode } from "./types";

export interface LedBackdrop {
  readonly floorTarget: Target;
  renderFrame(frame: Frame, args: { time: number }): void;
  rebuild(css: HeroRendererCss): void;
  resize(size: readonly [number, number]): void;
  setLedMode(mode: TriangleLedMode): void;
  setBrush(partial: Partial<BrushState>): void;
  applyTheme(theme: Theme): void;
  prewarm(): Promise<void>;
  destroy(): void;
}

export function createLedBackdrop(
  gpu: Gpu,
  format: GPUTextureFormat,
  css: HeroRendererCss,
): LedBackdrop {
  const presentationWidth = Math.max(1, Math.floor(css.width * css.dpr));
  const presentationHeight = Math.max(1, Math.floor(css.height * css.dpr));

  const floorTarget = target(gpu, {
    size: [presentationWidth, presentationHeight],
    format,
    label: "hero-led-floor",
  });

  const heroRenderer = createHeroRenderer(gpu, { theme: "dark", css, target: floorTarget });
  heroRenderer.setHero(heroStateForActiveClick(-1));

  let ledMode: TriangleLedMode = -1;

  const setLedMode = (mode: TriangleLedMode) => {
    if (!isTriangleLedMode(mode) || mode === ledMode) return;
    ledMode = mode;
    heroRenderer.setHero(heroStateForActiveClick(mode));
  };

  const applyTheme = (theme: Theme) => {
    setHeroLedTheme(theme);
    heroRenderer.setTunables({
      ledIntensity: theme === "light" ? 1.3 : 1,
      brightnessMin: theme === "light" ? 0.11 : 0.09,
    });
  };

  return {
    floorTarget,
    renderFrame(frame, { time }) {
      heroRenderer.renderFrame(frame, { time });
    },
    rebuild(nextCss) {
      heroRenderer.rebuild(nextCss);
      const width = Math.max(1, Math.floor(nextCss.width * nextCss.dpr));
      const height = Math.max(1, Math.floor(nextCss.height * nextCss.dpr));
      floorTarget.resize([width, height]);
      heroRenderer.setOutputTarget(floorTarget);
    },
    resize(size) {
      floorTarget.resize(size);
      heroRenderer.setOutputTarget(floorTarget);
    },
    setLedMode,
    setBrush(partial) {
      heroRenderer.setBrush(partial);
    },
    applyTheme,
    prewarm: () => heroRenderer.prewarm(),
    destroy: () => {
      heroRenderer.destroy();
      (floorTarget as Target & { destroy?: () => void }).destroy?.();
    },
  };
}

export function inactiveLedBrush(): BrushState {
  return brushState(DEFAULT_BRUSH);
}
