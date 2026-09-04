"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { HeroGlassRenderer } from "@/lib/hero/vgpuGlass/renderer";
import { isWebGPUSupported } from "@/lib/hero/vgpuGlass/isWebGPUSupported";

const HeroGlassFractalCanvas = dynamic(
  () => import("./HeroGlassFractalCanvas"),
  { ssr: false },
);

type HeroGlassFractalProps = {
  meshRef?: React.RefObject<HTMLDivElement | null>;
  stickyRef?: React.RefObject<HTMLElement | null>;
  rendererRef?: React.MutableRefObject<HeroGlassRenderer | null>;
};

export function HeroGlassFractal({
  meshRef,
  stickyRef,
  rendererRef: externalRendererRef,
}: HeroGlassFractalProps) {
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const internalRef = useRef<HTMLDivElement>(null);
  const internalRendererRef = useRef<HeroGlassRenderer | null>(null);
  const ref = meshRef ?? internalRef;
  const rendererRef = externalRendererRef ?? internalRendererRef;
  const [webgpuReady, setWebgpuReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isWebGPUSupported().then((supported) => {
      if (!cancelled) setWebgpuReady(supported);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (reducedMotion || webgpuReady === false) {
    return null;
  }

  if (webgpuReady === null) {
    return null;
  }

  return (
    <div ref={ref} className="hero-glass-fractal" aria-hidden="true">
      <HeroGlassFractalCanvas
        theme={theme}
        containerRef={ref}
        pointerRef={stickyRef ?? ref}
        rendererRef={rendererRef}
      />
    </div>
  );
}

export type { HeroGlassRenderer };
export type { TriangleLedMode } from "@/lib/hero/vgpuGlass/ledBackdrop/types";
