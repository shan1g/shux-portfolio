"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DotsMorphIcon } from "@/components/nav/DotsMorphIcon";
import { LiquidGlassPanel } from "@/components/glass/LiquidGlassPanel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { navItems } from "@/lib/projects";
import { springSoft } from "@/lib/motion";
import {
  pauseScroll,
  resumeScroll,
  scrollToTarget,
} from "@/lib/scroll/lenisInstance";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    pauseScroll();

    const timer = window.setTimeout(() => firstLinkRef.current?.focus(), 50);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      resumeScroll();
      window.clearTimeout(timer);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;

    const onFocusIn = (e: FocusEvent) => {
      const menu = menuRef.current;
      const button = buttonRef.current;
      if (!menu || !button) return;
      if (!menu.contains(e.target as Node) && e.target !== button) {
        close();
      }
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [open, close]);

  const handleNavClick = (href: string) => {
    close();
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) scrollToTarget(el, { immediate: reducedMotion });
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Close menu overlay"
            className="site-nav__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
        ) : null}
      </AnimatePresence>

      <nav className="site-nav" aria-label="Site navigation">
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={menuRef}
              id="site-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.85, y: 16 }}
              transition={springSoft}
              className="site-nav__menu"
            >
              <LiquidGlassPanel
                borderRadius={20}
                refractionLevel={0.85}
                shape="roundedRect"
              >
                <ul className="site-nav__list">
                  {navItems.map((item, index) => (
                    <li key={item.href}>
                      <a
                        ref={index === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(item.href);
                        }}
                        className="site-nav__link"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                  <li className="site-nav__appearance">
                    <p className="site-nav__appearance-label">Appearance</p>
                    <ThemeToggle />
                  </li>
                </ul>
              </LiquidGlassPanel>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="site-nav__trigger"
        >
          <LiquidGlassPanel
            borderRadius={9999}
            refractionLevel={0.7}
            shape="circle"
            className="liquid-glass-panel--circle"
          >
            <span className="site-nav__trigger-inner">
              <DotsMorphIcon open={open} />
            </span>
          </LiquidGlassPanel>
        </button>
      </nav>
    </>
  );
}
