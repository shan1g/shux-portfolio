"use client";

import { useRef, type ReactNode } from "react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

type SectionProps = {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  /** Hero glass endpoint(s) shown while this section is in view, e.g. "orb". */
  glassShape?: string;
};

export function Section({
  id,
  title,
  children,
  className = "",
  eyebrow,
  glassShape,
}: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`section ${className}`.trim()}
      data-glass-shape={glassShape}
    >
      <div className="container">
        {eyebrow ? (
          <SectionEyebrow targetRef={sectionRef}>{eyebrow}</SectionEyebrow>
        ) : null}
        <h2 id={`${id}-heading`} className="text-section-title">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
