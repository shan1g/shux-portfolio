"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { navItems } from "@/lib/projects";
import { springSoft } from "@/lib/motion";
import { scrollToTarget } from "@/lib/scroll/lenisInstance";
import { ThemeToggleOrb } from "@/components/theme/ThemeToggleOrb";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function NavTabs() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const triggers = navItems.map((item, index) => {
      const target = document.getElementById(item.href.replace("#", ""));
      if (!target) return null;

      return ScrollTrigger.create({
        trigger: target,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) setActiveIndex(index);
        },
      });
    });

    return () => triggers.forEach((trigger) => trigger?.kill());
  }, []);

  const select = (index: number, href: string) => {
    setActiveIndex(index);
    const target = document.getElementById(href.replace("#", ""));
    if (target) scrollToTarget(target, { immediate: reducedMotion });
  };

  return (
    <div className="nav-tabs">
      <nav className="nav-tabs__bar" aria-label="Section navigation">
        <ul className="nav-tabs__list" role="tablist">
          {navItems.map((item, index) => {
            const isSelected = index === activeIndex;

            return (
              <li key={item.href} className="nav-tabs__item">
                <motion.button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`nav-tabs__button${
                    isSelected ? " nav-tabs__button--active" : ""
                  }`}
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  whileFocus={reducedMotion ? undefined : { scale: 1.03 }}
                  onClick={() => select(index, item.href)}
                >
                  {isSelected ? (
                    <motion.span
                      layoutId={reducedMotion ? undefined : "nav-tab-indicator"}
                      layout={!reducedMotion}
                      transition={springSoft}
                      className="nav-tabs__indicator"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="nav-tabs__label">{item.label}</span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </nav>

      <ThemeToggleOrb />
    </div>
  );
}
