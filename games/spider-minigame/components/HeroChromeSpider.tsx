"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ChromeSpiderRenderer } from "../lib/createChromeSpiderRenderer";

// three.js and the spider's geometry only load in the browser, in their own
// chunk, so the hero's server render stays light.
const HeroChromeSpiderCanvas = dynamic(
  () => import("./HeroChromeSpiderCanvas"),
  { ssr: false },
);

type HeroChromeSpiderProps = {
  rendererRef: React.MutableRefObject<ChromeSpiderRenderer | null>;
  /** Called once the spider has compiled and drawn its first frame. */
  onReady?: (renderer: ChromeSpiderRenderer) => void;
};

// With reduced motion the spider is still drawn, as one assembled still with
// no animation loop and no scroll teardown.
export function HeroChromeSpider({ rendererRef, onReady }: HeroChromeSpiderProps) {
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();

  return (
    <div className="hero-spider" aria-hidden="true">
      <HeroChromeSpiderCanvas
        theme={theme}
        animated={!reducedMotion}
        rendererRef={rendererRef}
        onReady={onReady}
      />
    </div>
  );
}

export type { ChromeSpiderRenderer };
