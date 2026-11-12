"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function useSectionParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;

    const media = gsap.matchMedia();

    media.add(
      {
        all: "all",
        desktop: "(min-width: 768px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      ({ conditions }) => {
        if (conditions?.reduced) return;

        root.querySelectorAll<HTMLElement>("[data-section-parallax]").forEach(
          (layer) => {
            const distance = Number(
              conditions?.desktop
                ? layer.dataset.sectionParallax
                : layer.dataset.sectionParallaxMobile,
            );
            if (!Number.isFinite(distance) || !distance) return;

            gsap.fromTo(
              layer,
              { y: distance },
              {
                y: -distance,
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.6,
                  invalidateOnRefresh: true,
                },
              },
            );
          },
        );
      },
      root,
    );

    return () => media.revert();
  }, [ref, reducedMotion]);
}
