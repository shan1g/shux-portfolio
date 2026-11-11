"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/components/theme/ThemeProvider";
import {
  createChromeSpiderRenderer,
  type ChromeSpiderRenderer,
} from "../lib/createChromeSpiderRenderer";

type HeroChromeSpiderCanvasProps = {
  theme: Theme;
  animated: boolean;
  rendererRef: React.MutableRefObject<ChromeSpiderRenderer | null>;
  onReady?: (renderer: ChromeSpiderRenderer) => void;
};

// Phones skip the mirrored floor reflection: it is a second full spider.
const REFLECTION_QUERY = "(min-width: 768px)";

export default function HeroChromeSpiderCanvas({
  theme,
  animated,
  rendererRef,
  onReady,
}: HeroChromeSpiderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: ChromeSpiderRenderer;
    try {
      renderer = createChromeSpiderRenderer({
        canvas,
        theme,
        animated,
        reflection: window.matchMedia(REFLECTION_QUERY).matches,
      });
    } catch {
      // No WebGL: the canvas stays hidden and the glass backdrop carries the hero.
      return;
    }

    let cancelled = false;
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
    // theme and motion are applied by the effects below — avoid rebuilding the spider on a toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendererRef]);

  useEffect(() => {
    rendererRef.current?.applyTheme(theme);
  }, [rendererRef, theme]);

  useEffect(() => {
    rendererRef.current?.setAnimated(animated);
  }, [rendererRef, animated]);

  return (
    <canvas
      ref={canvasRef}
      className={`hero-spider__canvas${isReady ? " hero-spider__canvas--ready" : ""}`}
      aria-hidden="true"
    />
  );
}
