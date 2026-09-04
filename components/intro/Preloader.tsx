"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useAssetReadiness } from "@/hooks/useAssetReadiness";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { emitIntroComplete } from "@/lib/intro/introEvents";
import { pauseScroll, resumeScroll } from "@/lib/scroll/lenisInstance";

const STATUS_STEPS = [
  { at: 0, label: "Waking the machine" },
  { at: 0.34, label: "Loading geometry" },
  { at: 0.67, label: "Warming the glass" },
  { at: 0.99, label: "Ready" },
];

function statusFor(value: number): string {
  let label = STATUS_STEPS[0]!.label;
  for (const step of STATUS_STEPS) {
    if (value >= step.at) label = step.label;
  }
  return label;
}

export function Preloader() {
  const { progress, settled } = useAssetReadiness();
  const reducedMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef({ value: 0 });
  const exitedRef = useRef(false);

  useEffect(() => {
    if (dismissed) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.introActive = "true";
    pauseScroll();

    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.introActive;
      resumeScroll();
    };
  }, [dismissed]);

  useEffect(() => {
    if (dismissed) return;

    const shown = shownRef.current;

    const paint = () => {
      const clamped = Math.min(1, Math.max(0, shown.value));
      if (counterRef.current) {
        counterRef.current.textContent = String(
          Math.round(clamped * 100),
        ).padStart(2, "0");
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${clamped})`;
      }
      if (statusRef.current) {
        const label = statusFor(clamped);
        if (statusRef.current.textContent !== label) {
          statusRef.current.textContent = label;
        }
      }
    };

    const tween = gsap.to(shown, {
      value: progress,
      duration: reducedMotion ? 0 : 0.7,
      ease: "power2.out",
      onUpdate: paint,
      onComplete: paint,
    });

    return () => {
      tween.kill();
    };
  }, [progress, dismissed, reducedMotion]);

  useEffect(() => {
    if (!settled || exitedRef.current) return;
    exitedRef.current = true;

    const finish = () => {
      setDismissed(true);
      emitIntroComplete();
    };

    const root = rootRef.current;

    if (reducedMotion || !root) {
      const id = window.setTimeout(finish, 0);
      return () => window.clearTimeout(id);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.5, onComplete: finish });

      tl.to("[data-intro-fade]", {
        opacity: 0,
        y: -14,
        duration: 0.4,
        ease: "power2.inOut",
        stagger: 0.05,
      });

      tl.to(
        root,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 0.9,
          ease: "expo.inOut",
        },
        "-=0.1",
      );
    }, root);

    return () => ctx.revert();
  }, [settled, reducedMotion]);

  if (dismissed) return null;

  return (
    <div ref={rootRef} className="preloader">
      <p className="preloader__mark" data-intro-fade>
        SHUX
      </p>

      <div className="preloader__readout">
        <span ref={statusRef} className="preloader__status" data-intro-fade>
          Waking the machine
        </span>
        <p className="preloader__counter" data-intro-fade>
          <span ref={counterRef}>00</span>
          <span className="preloader__counter-unit">%</span>
        </p>
      </div>

      <span className="preloader__bar" data-intro-fade aria-hidden="true">
        <span ref={barRef} className="preloader__bar-fill" />
      </span>

      <p className="sr-only" role="status" aria-live="polite">
        Loading experience
      </p>
    </div>
  );
}
