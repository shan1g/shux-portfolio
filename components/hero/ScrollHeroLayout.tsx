"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroSegmentType } from "./HeroSegmentType";
import { ChameleonWalker, type ChameleonWalkerRenderer } from "./ChameleonWalker";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onIntroComplete } from "@/lib/intro/introEvents";

gsap.registerPlugin(ScrollTrigger, Observer);

// The walker's build blocks the main thread for a few seconds, so it starts
// only once the lettering's warm-up flicker (under a second) has played out:
// this long after the intro lifts.
const WALKER_MOUNT_DELAY_MS = 1500;
// Once built, the walker waits this long, then walks in from the nearer edge
// of the screen.
const WALKER_ENTER_DELAY_MS = 700;
// Where along its track it would like to stand at the top of the page: the
// middle. restSpot() moves it aside when that is behind the nav pill or the
// scroll cue.
const WALKER_START = 0.5;
// One crossing of the screen per this many viewport heights of scroll: it
// walks to one end, turns, and walks back, for as long as the page goes on.
const CROSSING_VH = 1.6;
// The walker is a full chameleon build, so it waits for idle time after the
// first paint, but no longer than this.
const WALKER_IDLE_TIMEOUT_MS = 2500;
// What the walker should not come to rest behind: the nav pill (SiteNav) and
// the scroll cue.
const WALKER_AVOID = ".site-nav__bar, .hero-scroll-cue";

// Where the walker stands at the top of the page: WALKER_START, or the
// nearest spot clear of WALKER_AVOID.
function restSpot(walker: ChameleonWalkerRenderer): number {
  const boxes = Array.from(document.querySelectorAll(WALKER_AVOID), (el) =>
    el.getBoundingClientRect(),
  );
  return walker.clearPosition(WALKER_START, boxes);
}

// The walker's place along the screen for a scroll offset, from its rest
// spot.
function walkerPosition(start: number, scroll: number): number {
  return pingPong(start + scroll / (window.innerHeight * CROSSING_VH));
}

// 0 → 1 → 0 → 1 … as u climbs: the walker's place along the screen.
function pingPong(u: number): number {
  const m = Math.max(0, u) % 2;
  return m <= 1 ? m : 2 - m;
}

export function ScrollHeroLayout({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<ChameleonWalkerRenderer | null>(null);
  // Where scroll currently wants the walker. It loads in its own chunk and
  // compiles asynchronously, so it adopts this on ready instead of waiting
  // for the next scroll event. Without this, a mid-page reload walks it to
  // the wrong place.
  const desiredPositionRef = useRef(WALKER_START);
  // Where it stands at the top of the page, clear of the nav (restSpot).
  const startRef = useRef(WALKER_START);
  const [walkerMounted, setWalkerMounted] = useState(false);
  const [readyWalker, setReadyWalker] =
    useState<ChameleonWalkerRenderer | null>(null);
  const reducedMotion = useReducedMotion();

  const handleWalkerReady = useCallback((renderer: ChameleonWalkerRenderer) => {
    startRef.current = restSpot(renderer);
    desiredPositionRef.current = walkerPosition(startRef.current, window.scrollY);
    renderer.setPosition(desiredPositionRef.current, true);
    setReadyWalker(renderer);
  }, []);

  // Build the walker after the opening, in idle time, so its geometry does
  // not freeze the preloader or the name's warm-up flicker.
  useEffect(() => {
    if (reducedMotion || walkerMounted) return;

    let delay = 0;
    let idle = 0;
    const mount = () => setWalkerMounted(true);
    const off = onIntroComplete(() => {
      delay = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") {
          idle = window.requestIdleCallback(mount, {
            timeout: WALKER_IDLE_TIMEOUT_MS,
          });
        } else {
          mount();
        }
      }, WALKER_MOUNT_DELAY_MS);
    });
    return () => {
      off();
      window.clearTimeout(delay);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [reducedMotion, walkerMounted]);

  // Once the intro has lifted and the walker has been built and compiled (it
  // is only built after the opening), it walks in from the nearer edge of
  // the screen.
  useEffect(() => {
    if (!readyWalker) return;

    let timer = 0;
    const offIntro = onIntroComplete(() => {
      timer = window.setTimeout(
        () => readyWalker.enter(),
        WALKER_ENTER_DELAY_MS,
      );
    });
    return () => {
      offIntro();
      window.clearTimeout(timer);
    };
  }, [readyWalker]);

  useEffect(() => {
    const track = trackRef.current;
    const glow = glowRef.current;
    if (reducedMotion || !track || !glow) return;

    const ctx = gsap.context(() => {
      // Subtle handoff into Work: the glow drifts up, widens and fades out
      // as the section arrives.
      gsap.to(glow, {
        opacity: 0,
        scale: 1.3,
        y: "-10vh",
        ease: "power1.in",
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
    }, track);

    return () => ctx.revert();
  }, [reducedMotion]);

  // The walker paces back and forth along the bottom of the screen with
  // scroll: down the page it keeps crossing and turning, and scrolling up
  // walks it back the way it came. It eases toward its target itself, so no
  // scrub here.
  useEffect(() => {
    // Reduced motion never mounts the walker.
    if (reducedMotion) return;

    const apply = (scroll: number, immediate: boolean) => {
      // A refresh (a resize, or the intro's) can move the nav, so the rest
      // spot is found again.
      if (immediate && walkerRef.current) {
        startRef.current = restSpot(walkerRef.current);
      }
      const position = walkerPosition(startRef.current, scroll);
      desiredPositionRef.current = position;
      // Snap on refreshes: a resize or the intro's ScrollTrigger.refresh()
      // should not read as a walk.
      walkerRef.current?.setPosition(position, immediate);
    };

    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.scroll(), false),
      onRefresh: (self) => apply(self.scroll(), true),
    });

    apply(trigger.scroll(), true);

    return () => trigger.kill();
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

  useEffect(() => onIntroComplete(() => ScrollTrigger.refresh()), []);

  return (
    <Fragment>
      <div ref={trackRef} className="scroll-hero">
        <div className="scroll-hero__sticky">
          <div className="scroll-hero__stage">
            <div ref={glowRef} className="hero-glow" aria-hidden="true" />
            <HeroSegmentType trackRef={trackRef} />
            <h1 className="hero-title">SHUX — Shan Gray, front-end engineer</h1>
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

      {!reducedMotion && walkerMounted ? (
        <ChameleonWalker rendererRef={walkerRef} onReady={handleWalkerReady} />
      ) : null}
    </Fragment>
  );
}
