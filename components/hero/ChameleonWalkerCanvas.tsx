"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/components/theme/ThemeProvider";
import {
  createChameleonWalker,
  type ChameleonWalkerRenderer,
} from "@/lib/hero/chameleon/createChameleonWalker";

type ChameleonWalkerCanvasProps = {
  theme: Theme;
  rendererRef: React.MutableRefObject<ChameleonWalkerRenderer | null>;
  onReady?: (renderer: ChameleonWalkerRenderer) => void;
};

export default function ChameleonWalkerCanvas({
  theme,
  rendererRef,
  onReady,
}: ChameleonWalkerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: ChameleonWalkerRenderer;
    try {
      renderer = createChameleonWalker({ canvas, theme });
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
    // the theme is applied by the effect below — avoid rebuilding the chameleon on a toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendererRef]);

  useEffect(() => {
    rendererRef.current?.applyTheme(theme);
  }, [rendererRef, theme]);

  return <canvas ref={canvasRef} className="chameleon-walker__canvas" aria-hidden="true" />;
}
