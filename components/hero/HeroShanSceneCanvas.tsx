"use client";

import { useEffect, useRef } from "react";
import { createShanScene } from "@/lib/hero/shanScene/createShanScene";
import { onIntroComplete } from "@/lib/intro/introEvents";

// The scene's canvas. The letters come in as the intro lifts; held still, the
// finished scene shows straight away.
export default function HeroShanSceneCanvas({ still }: { still: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: ReturnType<typeof createShanScene>;
    try {
      scene = createShanScene({ canvas, still });
    } catch {
      // No WebGL: the backdrop shows on its own.
      return;
    }

    const offIntro = still ? () => {} : onIntroComplete(() => scene.play());
    return () => {
      offIntro();
      scene.dispose();
    };
  }, [still]);

  return <canvas ref={canvasRef} className="hero-scene__canvas" aria-hidden="true" />;
}
