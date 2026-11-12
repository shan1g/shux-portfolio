"use client";

import { useRef, type ReactNode } from "react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

type SectionProps = {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
};

export function Section({
  id,
  title,
  children,
  className = "",
  eyebrow,
}: SectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`section ${className}`.trim()}
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
