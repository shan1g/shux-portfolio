"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const PHRASE = "LET'S CREATE · OH SHUX · SHANENIGAINS · DEEZ FLEX";

export function OutroMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    const row = rowRef.current;
    if (reducedMotion || !track || !row) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        row,
        { xPercent: 0 },
        {
          xPercent: -35,
          ease: "none",
          scrollTrigger: {
            trigger: track,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        },
      );
    }, track);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={trackRef} className="outro-marquee" aria-hidden="true">
      <div ref={rowRef} className="outro-marquee__row">
        <span>{`${PHRASE} · ${PHRASE} · ${PHRASE}`}</span>
      </div>
    </div>
  );
}
