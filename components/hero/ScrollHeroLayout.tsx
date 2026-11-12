"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroShanScene } from "./HeroShanScene";
import { ChameleonWalker, type ChameleonWalkerRenderer } from "./ChameleonWalker";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onIntroComplete } from "@/lib/intro/introEvents";

gsap.registerPlugin(ScrollTrigger, Observer);

// The walker's build blocks the main thread for a few seconds, so it starts
// only once the letters' entrance (about two seconds) has played out: this
// long after the intro lifts.
const WALKER_MOUNT_DELAY_MS = 2000;
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
// The walker only runs from md (@bp-md) up; phones never build it, so their
// GPU and CPU go to the hero.
const WALKER_MEDIA = "(min-width: 768px)";
// Once the end of Work has scrolled up past the middle of the screen, the
// walker walks off the nearer edge and is unmounted, freeing its render loop
// and geometry.
const WALKER_LEAVE_AFTER = "#work";
// The walker is for first visits. A first visit marks it "pending", and it is
// marked "left" only once it has walked in and off again, so a visitor who
// scrolled past Work before it appeared still gets it next time.
const WALKER_KEY = "shux:chameleon";
// Set by the Preloader once the intro has played: a returning visitor.
const INTRO_SEEN_KEY = "shux:intro-seen";

// Whether this visit gets the walker. Read on mount, before the Preloader
// marks the intro seen.
function walkerDue(): boolean {
  try {
    const store = window.localStorage;
    const state = store.getItem(WALKER_KEY);
    if (store.getItem(INTRO_SEEN_KEY) === "1") return state === "pending";
    if (state === "left") return false;
    if (state === null) store.setItem(WALKER_KEY, "pending");
    return true;
  } catch {
    // Without storage every visit is a first visit, as for the intro.
    return true;
  }
}

function rememberWalkerLeft(): void {
  try {
    window.localStorage.setItem(WALKER_KEY, "left");
  } catch {
    // Storage can be unavailable (private mode); it just walks again next visit.
  }
}

// Whether the end of Work has scrolled up past the middle of the screen.
function pastWork(): boolean {
  const work = document.querySelector(WALKER_LEAVE_AFTER);
  return !!work && work.getBoundingClientRect().bottom <= window.innerHeight / 2;
}

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
  const cueRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<ChameleonWalkerRenderer | null>(null);
  // Where scroll currently wants the walker. It loads in its own chunk and
  // compiles asynchronously, so it adopts this on ready instead of waiting
  // for the next scroll event. Without this, a mid-page reload walks it to
  // the wrong place.
  const desiredPositionRef = useRef(WALKER_START);
  // Where it stands at the top of the page, clear of the nav (restSpot).
  const startRef = useRef(WALKER_START);
  // Whether this visit gets the walker (walkerDue), read once on mount.
  const walkerDueRef = useRef(false);
  // Whether it has been told to walk in: only then does walking off count.
  const walkerEnteredRef = useRef(false);
  const [walkerMounted, setWalkerMounted] = useState(false);
  const [readyWalker, setReadyWalker] =
    useState<ChameleonWalkerRenderer | null>(null);
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery(WALKER_MEDIA);
  // It has walked off past Work (or Work was already behind the reader): it
  // stays unmounted from then on.
  const [walkerGone, setWalkerGone] = useState(false);

  const handleWalkerReady = useCallback((renderer: ChameleonWalkerRenderer) => {
    startRef.current = restSpot(renderer);
    desiredPositionRef.current = walkerPosition(startRef.current, window.scrollY);
    renderer.setPosition(desiredPositionRef.current, true);
    setReadyWalker(renderer);
  }, []);

  // Read on mount, before the Preloader marks the intro seen, and before the
  // effects below that use it.
  useEffect(() => {
    walkerDueRef.current = walkerDue();
  }, []);

  // Build the walker after the opening, in idle time, so its geometry does
  // not freeze the preloader or the letters' entrance. Desktop only, and only
  // for a visit that is due it.
  useEffect(() => {
    if (reducedMotion || !isDesktop || walkerMounted || walkerGone || !walkerDueRef.current) return;

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
  }, [reducedMotion, isDesktop, walkerMounted, walkerGone]);

  // Once the intro has lifted and the walker has been built and compiled (it
  // is only built after the opening), it walks in from the nearer edge of
  // the screen.
  useEffect(() => {
    if (!readyWalker) return;

    let timer = 0;
    const offIntro = onIntroComplete(() => {
      timer = window.setTimeout(() => {
        walkerEnteredRef.current = true;
        readyWalker.enter();
      }, WALKER_ENTER_DELAY_MS);
    });
    return () => {
      offIntro();
      window.clearTimeout(timer);
    };
  }, [readyWalker]);

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

  // Past Work the walker walks off the nearer edge, then is unmounted so its
  // render loop and geometry are freed. If it never walked in, it is
  // unmounted without counting as seen, so the next visit still gets it.
  useEffect(() => {
    if (reducedMotion || !isDesktop || walkerGone || !walkerDueRef.current) return;

    let leaving = false;
    const check = () => {
      if (leaving || !pastWork()) return;
      leaving = true;
      window.removeEventListener("scroll", check);
      const walker = walkerRef.current;
      const walkedIn = walkerEnteredRef.current;
      void (walker ? walker.leave() : Promise.resolve()).then(() => {
        if (walkedIn) rememberWalkerLeft();
        setWalkerGone(true);
      });
    };

    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, [reducedMotion, isDesktop, walkerGone]);

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
      <div className="scroll-hero">
        <div className="scroll-hero__sticky">
          <HeroShanScene />
          <div className="scroll-hero__stage">
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

      {!reducedMotion && isDesktop && walkerMounted && !walkerGone ? (
        <ChameleonWalker rendererRef={walkerRef} onReady={handleWalkerReady} />
      ) : null}
    </Fragment>
  );
}
