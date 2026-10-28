"use client";

import { useRef } from "react";
import { AboutScrollLines } from "@/components/about/AboutScrollLines";
import { KineticStatement } from "@/components/type/KineticStatement";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const STATEMENT_LINES = [
  "Oh shux — shanenigains,",
  "creative, deez flex.",
  "Interfaces that feel native",
  "on every single screen.",
];

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const ref = useScrollReveal();

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-labelledby="about-heading"
      className="section"
      data-glass-shape="orb"
    >
      <div className="container">
        <SectionEyebrow targetRef={sectionRef}>Who</SectionEyebrow>
        <h2 id="about-heading" className="text-section-title">
          About
        </h2>

        <KineticStatement
          lines={STATEMENT_LINES}
          tone="accent"
          className="about-statement"
        />

        <div ref={ref} className="about-support">
          <p data-reveal className="text-lead">
            My name is <strong className="text-strong">Shan Gray</strong>, based
            in South Africa. I build digital experiences where usability, motion,
            and craft meet.
          </p>
          <p data-reveal className="text-lead text-spaced-sm">
            SHUX is my personal studio and UX manifesto: a place to explore what
            good interaction design should feel like — clear, considerate, and
            quietly delightful.
          </p>
        </div>
      </div>
      <AboutScrollLines />
    </section>
  );
}
