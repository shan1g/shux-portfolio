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
  // Section a link asked for, scrolled to once the menu's scroll lock is gone.
  const pendingHrefRef = useRef<string | null>(null);

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

  // Opening the menu locks scrolling (`overflow: hidden` on <body> plus
  // `pauseScroll()`), and that lock is only released by the cleanup of the
  // `open` effect above — which React runs *after* a click handler returns. A
  // stopped Lenis silently drops `scrollTo` and `overflow: hidden` blocks the
  // `scrollIntoView` fallback, so scrolling from inside the handler did
  // nothing. The target is therefore recorded and the scroll deferred to an
  // effect, which runs after the lock has been released.
  useEffect(() => {
    if (open) return;

    const href = pendingHrefRef.current;
    if (!href) return;
    pendingHrefRef.current = null;

    const el = document.getElementById(href.replace("#", ""));
    if (el) scrollToTarget(el, { immediate: reducedMotion });
  }, [open, reducedMotion]);

  const handleNavClick = (href: string) => {
    pendingHrefRef.current = href;
    close();
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
