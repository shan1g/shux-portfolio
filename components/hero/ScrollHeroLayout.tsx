"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroGlassFractal, type HeroGlassRenderer } from "./HeroGlassFractal";
import { HeroChapters } from "./HeroChapters";
import { ShuxWordmark } from "./ShuxWordmark";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onIntroComplete } from "@/lib/intro/introEvents";
import { subscribeAudioEnergy } from "@/lib/audio/audioEnergyBus";
import {
  pageProgressToShapeState,
  type HeroShapeState,
} from "@/lib/hero/vgpuGlass/heroGlassScroll";
import { pageProgressToLedMode } from "@/lib/hero/vgpuGlass/ledBackdrop/heroLedScroll";

gsap.registerPlugin(ScrollTrigger, Observer);

const CHAPTER_WINDOW = 0.25;
const CHAPTER_FADE = 0.07;

export function ScrollHeroLayout({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const glassFractalRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HeroGlassRenderer | null>(null);
  const shapeStateRef = useRef<HeroShapeState>(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    if (reducedMotion || !track) return;

    const wordmark = wordmarkRef.current;
    const glow = glowRef.current;
    const glassFractal = glassFractalRef.current;
    if (!wordmark) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });

      tl.to(
        wordmark,
        {
          scale: 0.72,
          y: "-8vh",
          opacity: 0.55,
          ease: "none",
          duration: 1,
        },
        0,
      );

      if (glow) {
        tl.to(glow, { opacity: 0.15, ease: "none", duration: 1 }, 0);
      }

      if (glassFractal) {
        tl.to(glassFractal, { opacity: 0.35, ease: "none", duration: 1 }, 0);
      }

      const chapters = gsap.utils.toArray<HTMLElement>("[data-hero-chapter]");

      chapters.forEach((chapter, index) => {
        const start = index * CHAPTER_WINDOW;

        gsap.set(chapter, { opacity: 0, y: 36 });

        tl.to(
          chapter,
          { opacity: 1, y: 0, ease: "none", duration: CHAPTER_FADE },
          start,
        );

        tl.to(
          chapter,
          { opacity: 0, y: -36, ease: "none", duration: CHAPTER_FADE },
          start + CHAPTER_WINDOW - CHAPTER_FADE,
        );
      });
    }, track);

    return () => ctx.revert();
  }, [reducedMotion]);

  useEffect(() => {
    const cue = cueRef.current;
    if (reducedMotion || !cue) return;

    const observer = Observer.create({
      target: window,
      type: "wheel,touch,scroll",
      onChangeY: () => {
        gsap.to(cue, {
          opacity: 0,
          y: 12,
          duration: 0.4,
          ease: "power2.out",
          overwrite: true,
        });
        observer.kill();
      },
    });

    return () => observer.kill();
  }, [reducedMotion]);

  // The glass morph is driven by document-wide progress rather than the hero
  // track, so it keeps morphing after the hero pin releases. Scroll only selects
  // the endpoint; the renderer eases between them as the vgpu example does.
  useEffect(() => {
    if (reducedMotion) return;

    const apply = (progress: number, immediate: boolean) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const state = pageProgressToShapeState(progress, shapeStateRef.current);
      shapeStateRef.current = state;
      // Snap on the first application and on refreshes: a resize or the intro's
      // ScrollTrigger.refresh() should not read as a shape change.
      if (immediate) renderer.setSphereMixDirect(state);
      else renderer.setSphereMixTarget(state);
      renderer.setLedModeDirect(pageProgressToLedMode(progress));
    };

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.progress, false),
      onRefresh: (self) => apply(self.progress, true),
    });

    apply(trigger.progress, true);

    return () => trigger.kill();
  }, [reducedMotion]);

  useEffect(() => onIntroComplete(() => ScrollTrigger.refresh()), []);

  useEffect(() => {
    if (reducedMotion) return;

    return subscribeAudioEnergy((energy) => {
      rendererRef.current?.setAudioEnergyDirect(energy);
    });
  }, [reducedMotion]);

  return (
    <>
      <div ref={backdropRef} className="hero-glass-backdrop" aria-hidden="true">
        <HeroGlassFractal
          meshRef={glassFractalRef}
          stickyRef={backdropRef}
          rendererRef={rendererRef}
        />
      </div>

      <div ref={trackRef} className="scroll-hero">
        <div ref={stickyRef} className="scroll-hero__sticky">
          <div className="scroll-hero__stage">
            <div
              ref={glowRef}
              className="hero-wordmark-glow"
              aria-hidden="true"
            />
            <ShuxWordmark ref={wordmarkRef} />
            <HeroChapters reducedMotion={reducedMotion} />
          </div>

          {reducedMotion ? null : (
            <div ref={cueRef} className="hero-scroll-cue" aria-hidden="true">
              <span className="hero-scroll-cue__label">Scroll</span>
              <span className="hero-scroll-cue__rail">
                <span className="hero-scroll-cue__dot" />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="page-content">{children}</div>
    </>
  );
}
