"use client";

import { KineticStatement } from "@/components/type/KineticStatement";
import { OutroMarquee } from "@/components/sections/OutroMarquee";
import { siteLinks } from "@/lib/projects";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CTA_LINES = ["Let's build the one", "they didn't expect."];

const links = [
  { label: "GitHub", href: siteLinks.github },
  { label: "Behance", href: siteLinks.behance },
  { label: "LinkedIn", href: siteLinks.linkedin },
  { label: "X", href: siteLinks.x },
];

export function ContactSection() {
  const ref = useScrollReveal();

  return (
    <section id="contact" aria-labelledby="contact-heading" className="section">
      <div className="container">
        <p className="text-eyebrow">Connect</p>
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

          <ul className="outro-links">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-reveal
                  className="outro-links__link"
                >
                  <span className="outro-links__label">{link.label}</span>
                  <span className="outro-links__arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <OutroMarquee />
    </section>
  );
}
