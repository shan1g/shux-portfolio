"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { ChameleonWalkerRenderer } from "@/lib/hero/chameleon/createChameleonWalker";

// three.js and the chameleon's geometry load in the browser only, in their own chunk.
const ChameleonWalkerCanvas = dynamic(() => import("./ChameleonWalkerCanvas"), {
  ssr: false,
});

type ChameleonWalkerProps = {
  rendererRef: React.MutableRefObject<ChameleonWalkerRenderer | null>;
  /** Called once the walker has compiled; it shows nothing until told to. */
  onReady?: (renderer: ChameleonWalkerRenderer) => void;
};

// The small chameleon that walks back and forth along the bottom of the screen as you scroll. It is decorative:
// hidden from assistive tech, it never takes clicks, and it is not mounted with reduced motion.
export function ChameleonWalker({ rendererRef, onReady }: ChameleonWalkerProps) {
  const { theme } = useTheme();

  return (
    <div className="chameleon-walker" aria-hidden="true">
      <ChameleonWalkerCanvas theme={theme} rendererRef={rendererRef} onReady={onReady} />
    </div>
  );
}

export type { ChameleonWalkerRenderer };
