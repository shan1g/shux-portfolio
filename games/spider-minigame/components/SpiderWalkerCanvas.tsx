"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/components/theme/ThemeProvider";
import {
  createSpiderWalker,
  type SpiderWalkerRenderer,
} from "../lib/createSpiderWalker";

type SpiderWalkerCanvasProps = {
  theme: Theme;
  rendererRef: React.MutableRefObject<SpiderWalkerRenderer | null>;
  onReady?: (renderer: SpiderWalkerRenderer) => void;
};

export default function SpiderWalkerCanvas({
  theme,
  rendererRef,
  onReady,
}: SpiderWalkerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threadRef = useRef<HTMLSpanElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: SpiderWalkerRenderer;
    try {
      renderer = createSpiderWalker({ canvas, thread: threadRef.current, theme });
    } catch {
      // No WebGL: the strip stays empty.
      return;
    }

    let cancelled = false;
    rendererRef.current = renderer;

    void renderer.ready.then(() => {
      if (cancelled) return;
      onReadyRef.current?.(renderer);
    });

    return () => {
      cancelled = true;
      if (rendererRef.current === renderer) rendererRef.current = null;
      renderer.dispose();
    };
    // the theme is applied by the effect below — avoid rebuilding the spider on a toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendererRef]);

  useEffect(() => {
    rendererRef.current?.applyTheme(theme);
  }, [rendererRef, theme]);

  // The thread comes first so the canvas, painted after it, covers its end with the spider's body.
  return (
    <>
      <span ref={threadRef} className="spider-walker__thread" aria-hidden="true" />
      <canvas ref={canvasRef} className="spider-walker__canvas" aria-hidden="true" />
    </>
  );
}
