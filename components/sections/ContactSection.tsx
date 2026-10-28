"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { KineticStatement } from "@/components/type/KineticStatement";
import { OutroMarquee } from "@/components/sections/OutroMarquee";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { siteLinks } from "@/lib/projects";
import { springSnappy, springSoft } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CTA_LINES = ["Let's build the one", "they didn't expect."];

const links = [
  { label: "GitHub", href: siteLinks.github },
  { label: "Behance", href: siteLinks.behance },
  { label: "LinkedIn", href: siteLinks.linkedin },
  { label: "X", href: siteLinks.x },
];

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const ref = useScrollReveal();
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-labelledby="contact-heading"
      className="section"
      data-glass-shape="fractal"
    >
      <div className="container">
        <SectionEyebrow targetRef={sectionRef}>Connect</SectionEyebrow>
        <h2 id="contact-heading" className="text-section-title">
          Contact
        </h2>

        <KineticStatement
          lines={CTA_LINES}
          tone="accent"
          className="outro-statement"
        />

        <div ref={ref} className="outro-body">
          <p data-reveal className="text-lead">
            Open to collaborations, freelance projects, and conversations about
            interaction design. Not always in the spotlight — usually out there
            on the edge.
          </p>

          <ul className="outro-links" onPointerLeave={() => setHovered(null)}>
            {links.map((link) => {
              const isHovered = hovered === link.label;

              return (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-reveal
                    className="outro-links__link"
                    onPointerEnter={() => setHovered(link.label)}
                    onFocus={() => setHovered(link.label)}
                    onBlur={() => setHovered(null)}
                  >
                    {isHovered ? (
                      <motion.span
                        layoutId={
                          reducedMotion ? undefined : "outro-link-highlight"
                        }
                        transition={springSoft}
                        className="outro-links__highlight"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="outro-links__label">{link.label}</span>
                    <motion.span
                      className="outro-links__arrow"
                      animate={
                        isHovered && !reducedMotion
                          ? { x: 3, y: -3 }
                          : { x: 0, y: 0 }
                      }
                      transition={springSnappy}
                      aria-hidden="true"
                    >
                      ↗
                    </motion.span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <OutroMarquee />
    </section>
  );
}
