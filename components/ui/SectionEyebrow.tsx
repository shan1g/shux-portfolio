"use client";

import type { ReactNode, RefObject } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type SectionEyebrowProps = {
  children: ReactNode;
  /** Section whose read-through progress fills the rail. */
  targetRef: RefObject<HTMLElement | null>;
};

export function SectionEyebrow({ children, targetRef }: SectionEyebrowProps) {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <p className="text-eyebrow section-eyebrow">
      <span>{children}</span>
      <span className="section-eyebrow__rail" aria-hidden="true">
        <motion.span
          className="section-eyebrow__fill"
          style={{ scaleX: reducedMotion ? scrollYProgress : smoothProgress }}
        />
      </span>
    </p>
  );
}
