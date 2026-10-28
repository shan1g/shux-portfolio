"use client";

import { Fragment, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  HeroGlassFractal,
  type HeroGlassRenderer,
  type TriangleLedMode,
} from "./HeroGlassFractal";
import { HeroChapters } from "./HeroChapters";
import { ShuxWordmark } from "./ShuxWordmark";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onIntroComplete } from "@/lib/intro/introEvents";
import { subscribeAudioEnergy } from "@/lib/audio/audioEnergyBus";
import {
  HERO_SHAPE_ORB,
  parseShapeSequence,
  zoneProgressToSegment,
  type HeroShapeState,
} from "@/lib/hero/vgpuGlass/heroGlassScroll";
import { pageProgressToLedMode } from "@/lib/hero/vgpuGlass/ledBackdrop/heroLedScroll";

gsap.registerPlugin(ScrollTrigger, Observer);

const CHAPTER_WINDOW = 0.25;
const CHAPTER_FADE = 0.07;

// One endpoint per hero chapter, so the glass flips with each chapter the way
// the vgpu example's Fractal / Orb switch does.
const HERO_SHAPES = "orb fractal orb fractal";

// A zone takes over when its top edge crosses this line of the viewport.
const ZONE_LINE = "55%";

export function ScrollHeroLayout({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const glassFractalRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HeroGlassRenderer | null>(null);
  // The endpoint and LED mode scroll currently asks for. The renderer loads
  // asynchronously, so it adopts these on ready instead of waiting for the
  // next scroll event. Without this, a mid-page reload shows the wrong shape.
  const desiredShapeRef = useRef<HeroShapeState>(HERO_SHAPE_ORB);
  const desiredLedRef = useRef<TriangleLedMode>(pageProgressToLedMode(0));
  const reducedMotion = useReducedMotion();

  const handleRendererReady = useCallback((renderer: HeroGlassRenderer) => {
    renderer.setSphereMixDirect(desiredShapeRef.current);
    renderer.setLedModeDirect(desiredLedRef.current);
  }, []);

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
        // The morph keeps switching past the hero pin, so the object has to
        // stay legible after the hero fade rather than dropping to 0.35.
        tl.to(glassFractal, { opacity: 0.55, ease: "none", duration: 1 }, 0);
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

  // Scroll is the switch. Each `[data-glass-shape]` zone (hero chapters, then
  // every section) selects an endpoint, and the renderer eases between them
  // with the example's fixed-duration easeOutQuart morph.
  useEffect(() => {
    if (reducedMotion) return;

    const applyShape = (state: HeroShapeState, immediate: boolean) => {
      desiredShapeRef.current = state;
      const renderer = rendererRef.current;
      if (!renderer) return;
      // Snap on first application and on refreshes: a resize or the intro's
      // ScrollTrigger.refresh() should not read as a shape change.
      if (immediate) renderer.setSphereMixDirect(state);
      else renderer.setSphereMixTarget(state);
    };

    const zones = gsap.utils
      .toArray<HTMLElement>("[data-glass-shape]")
      .map((element) => {
        const sequence = parseShapeSequence(element.dataset.glassShape);
        let segment = -1;

        const update = (self: ScrollTrigger, immediate: boolean) => {
          if (!self.isActive) return;
          segment = zoneProgressToSegment(
            self.progress,
            sequence.length,
            immediate ? -1 : segment,
          );
          applyShape(sequence[segment] ?? HERO_SHAPE_ORB, immediate);
        };

        const trigger = ScrollTrigger.create({
          trigger: element,
          start: `top ${ZONE_LINE}`,
          end: `bottom ${ZONE_LINE}`,
          invalidateOnRefresh: true,
          onToggle: (self) => update(self, false),
          onUpdate: (self) => update(self, false),
          onRefresh: (self) => update(self, true),
        });

        return { trigger, update };
      });

    zones.forEach(({ trigger, update }) => update(trigger, true));

    const applyLed = (progress: number) => {
      const mode = pageProgressToLedMode(progress);
      desiredLedRef.current = mode;
      rendererRef.current?.setLedModeDirect(mode);
    };

    const ledTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => applyLed(self.progress),
      onRefresh: (self) => applyLed(self.progress),
    });

    applyLed(ledTrigger.progress);

    return () => {
      zones.forEach(({ trigger }) => trigger.kill());
      ledTrigger.kill();
    };
  }, [reducedMotion]);

  useEffect(() => onIntroComplete(() => ScrollTrigger.refresh()), []);

  useEffect(() => {
    if (reducedMotion) return;

    return subscribeAudioEnergy((energy) => {
      rendererRef.current?.setAudioEnergyDirect(energy);
    });
  }, [reducedMotion]);

  return (
    <Fragment>
      <div ref={backdropRef} className="hero-glass-backdrop" aria-hidden="true">
        <HeroGlassFractal
          meshRef={glassFractalRef}
          stickyRef={backdropRef}
          rendererRef={rendererRef}
          onReady={handleRendererReady}
        />
      </div>

      <div ref={trackRef} className="scroll-hero" data-glass-shape={HERO_SHAPES}>
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
    </Fragment>
  );
}
