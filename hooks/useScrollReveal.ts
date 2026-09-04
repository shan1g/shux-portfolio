"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

type UseScrollRevealOptions = {
  stagger?: number;
  y?: number;
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {},
) {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();
  const { stagger = 0.1, y = 40 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    const targets = el.querySelectorAll("[data-reveal]");
    const items = targets.length > 0 ? targets : [el];

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [reducedMotion, stagger, y]);

  return ref;
}
