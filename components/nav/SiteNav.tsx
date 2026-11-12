"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { navItems } from "@/lib/projects";
import { springSoft } from "@/lib/motion";
import { scrollToSection } from "@/lib/scroll/lenisInstance";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

// One bottom bar on every screen size: section links, then the theme
// control. Links are real anchors, so they still work before
// hydration and without smooth scrolling.
export function SiteNav() {
  const reducedMotion = useReducedMotion();
  // No link is current while the hero is on screen.
  const [activeHref, setActiveHref] = useState<string | null>(null);

  useEffect(() => {
    const triggers = navItems.map((item) => {
      const target = document.getElementById(item.href.slice(1));
      if (!target) return null;

      return ScrollTrigger.create({
        trigger: target,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) {
            setActiveHref(item.href);
            return;
          }
          setActiveHref((current) => (current === item.href ? null : current));
        },
      });
    });

    return () => triggers.forEach((trigger) => trigger?.kill());
  }, []);

  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!scrollToSection(href.slice(1), { immediate: reducedMotion })) return;
    event.preventDefault();
    setActiveHref(href);
  };

  return (
    <div className="site-nav">
      <nav className="site-nav__bar" aria-label="Sections">
        <ul className="site-nav__list">
          {navItems.map((item) => {
            const active = item.href === activeHref;

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`site-nav__link${active ? " site-nav__link--active" : ""}`}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => onLinkClick(event, item.href)}
                >
                  {active ? (
                    <motion.span
                      layoutId={reducedMotion ? undefined : "site-nav-indicator"}
                      transition={springSoft}
                      className="site-nav__indicator"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="site-nav__label">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <span className="site-nav__divider" aria-hidden="true" />
        <ThemeToggle />
      </nav>
    </div>
  );
}
