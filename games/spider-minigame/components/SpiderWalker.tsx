"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { SpiderWalkerRenderer } from "../lib/createSpiderWalker";

// three.js and the spider's geometry load in the browser only, in their own chunk.
const SpiderWalkerCanvas = dynamic(() => import("./SpiderWalkerCanvas"), {
  ssr: false,
});

type SpiderWalkerProps = {
  rendererRef: React.MutableRefObject<SpiderWalkerRenderer | null>;
  /** Called once the walker has compiled; it shows nothing until told to. */
  onReady?: (renderer: SpiderWalkerRenderer) => void;
};

// The small spider that walks back and forth along the bottom of the screen as you scroll. It is decorative: hidden from
// assistive tech, it never takes clicks, and it is not mounted with reduced motion.
export function SpiderWalker({ rendererRef, onReady }: SpiderWalkerProps) {
  const { theme } = useTheme();

  return (
    <div className="spider-walker" aria-hidden="true">
      <SpiderWalkerCanvas theme={theme} rendererRef={rendererRef} onReady={onReady} />
    </div>
  );
}

export type { SpiderWalkerRenderer };
