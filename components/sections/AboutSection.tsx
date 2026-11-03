"use client";

import { useRef } from "react";
import { AboutScrollLines } from "@/components/about/AboutScrollLines";
import { KineticStatement } from "@/components/type/KineticStatement";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const STATEMENT_LINES = [
  "Oh shux — I engineer",
  "the front end.",
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
            My name is <strong className="text-strong">Shan Gray</strong>, a
            front-end engineer in Johannesburg, South Africa. I’ve built for the
            web since 2010 and am Development Lead at Ogilvy South Africa,
            shipping campaign platforms, booking flows and interactive
            experiences.
          </p>
          <p data-reveal className="text-lead text-spaced-sm">
            SHUX is my personal playground: a place to explore what front-end
            engineering should feel like — fast, accessible, and quietly
            delightful.
          </p>
        </div>
      </div>
      <AboutScrollLines />
    </section>
  );
}
