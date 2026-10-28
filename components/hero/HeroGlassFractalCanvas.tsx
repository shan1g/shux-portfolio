"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/components/theme/ThemeProvider";
import type { HeroGlassRenderer } from "@/lib/hero/vgpuGlass/renderer";
import { createRenderer } from "@/lib/hero/vgpuGlass/renderer";

type HeroGlassFractalCanvasProps = {
  theme: Theme;
  containerRef: React.RefObject<HTMLElement | null>;
  pointerRef: React.RefObject<HTMLElement | null>;
  rendererRef: React.MutableRefObject<HeroGlassRenderer | null>;
  onReady?: (renderer: HeroGlassRenderer) => void;
};

export default function HeroGlassFractalCanvas({
  theme,
  containerRef,
  pointerRef,
  rendererRef,
  onReady,
}: HeroGlassFractalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const pointerTarget = pointerRef.current ?? container;
    if (!canvas || !container || !pointerTarget) return;

    const renderer = createRenderer({
      canvas,
      pointerElement: pointerTarget,
      theme,
    });
    rendererRef.current = renderer;

    void renderer.ready.then(() => {
      if (cancelled) return;
      setIsReady(true);
      onReadyRef.current?.(renderer);
    });

    return () => {
      cancelled = true;
      if (rendererRef.current === renderer) rendererRef.current = null;
      renderer.dispose();
      setIsReady(false);
    };
    // theme is applied via the effect below — avoid full renderer re-init on toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, pointerRef, rendererRef]);

  useEffect(() => {
    rendererRef.current?.applyTheme(theme);
  }, [rendererRef, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={`hero-glass-fractal__canvas${isReady ? " hero-glass-fractal__canvas--ready" : ""}`}
      aria-hidden="true"
    />
  );
}
