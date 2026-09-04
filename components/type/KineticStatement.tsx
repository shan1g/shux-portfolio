"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger, SplitText);

type KineticStatementProps = {
  lines: string[];
  tone?: "default" | "accent";
  className?: string;
};

export function KineticStatement({
  lines,
  tone = "default",
  className,
}: KineticStatementProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const splits: SplitText[] = [];

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-kinetic-line]");

      targets.forEach((target) => {
        const split = new SplitText(target, {
          type: "words",
          wordsClass: "kinetic__word",
        });
        splits.push(split);

        gsap.fromTo(
          split.words,
          { yPercent: 110, opacity: 0.15 },
          {
            yPercent: 0,
            opacity: 1,
            ease: "none",
            stagger: 0.35,
            scrollTrigger: {
              trigger: target,
              start: "top 85%",
              end: "top 35%",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    }, root);

    return () => {
      ctx.revert();
      splits.forEach((split) => split.revert());
    };
  }, [reducedMotion, lines]);

  return (
    <div
      ref={rootRef}
      className={`kinetic kinetic--${tone}${className ? ` ${className}` : ""}`}
    >
      {lines.map((line) => (
        <p key={line} className="kinetic__line" data-kinetic-line>
          {line}
        </p>
      ))}
    </div>
  );
}
