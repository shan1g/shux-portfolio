"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isIntroComplete, onIntroComplete } from "@/lib/intro/introEvents";
import { setLenisInstance } from "@/lib/scroll/lenisInstance";

gsap.registerPlugin(ScrollTrigger);

export function useSmoothScroll() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      smoothWheel: true,
    });

    setLenisInstance(lenis);

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    if (!isIntroComplete()) lenis.stop();

    const offIntro = onIntroComplete(() => {
      lenis.start();
      ScrollTrigger.refresh();
    });

    return () => {
      offIntro();
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(ticker);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      setLenisInstance(null);
    };
  }, [reducedMotion]);
}
