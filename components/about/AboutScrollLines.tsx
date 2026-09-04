"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const LINES = [
  "OH SHUX · SHANENIGAINS · CREATIVE · DEEZ FLEX",
  "OGILVY · BEHANCE · INTERACTION DESIGN",
  "MOTION · CRAFT · ACCESSIBILITY-FIRST",
  "UX PHILOSOPHY · SOUTH AFRICA · OH SHUX",
];

function MarqueeLine({
  text,
  x,
  reverse = false,
}: {
  text: string;
  x: MotionValue<number>;
  reverse?: boolean;
}) {
  const content = `${text} · ${text} · ${text}`;

  return (
    <div className="about-lines__track" aria-hidden="true">
      <motion.div
        className={`about-lines__row${reverse ? " about-lines__row--reverse" : ""}`}
        style={{ x }}
      >
        <span>{content}</span>
      </motion.div>
    </div>
  );
}

export function AboutScrollLines() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const x0 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const x1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const x2 = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const x3 = useTransform(scrollYProgress, [0, 1], [0, 240]);

  const transforms = [x0, x1, x2, x3];

  return (
    <div ref={sectionRef} className="about-lines" aria-hidden="true">
      {LINES.map((line, i) =>
        reducedMotion ? (
          <p key={line} className="about-lines__static">
            {line}
          </p>
        ) : (
          <MarqueeLine
            key={line}
            text={line}
            x={transforms[i]!}
            reverse={i % 2 === 1}
          />
        ),
      )}
    </div>
  );
}
