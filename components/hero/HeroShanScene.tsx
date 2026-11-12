"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// three.js and the scene load in the browser only, in their own chunk.
const HeroShanSceneCanvas = dynamic(() => import("./HeroShanSceneCanvas"), {
  ssr: false,
});

// The hero's 3D scene: "SHAN" in chunky extruded letters among frosted glass
// tubes and rings, on the page's own background (see lib/hero/shanScene). It is
// decorative: the page's h1 carries the name for assistive tech.
export function HeroShanScene() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="hero-scene" aria-hidden="true">
      <HeroShanSceneCanvas still={reducedMotion} />
    </div>
  );
}
