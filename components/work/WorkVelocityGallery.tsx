"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Project } from "@/lib/projects";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { scrollToY } from "@/lib/scroll/lenisInstance";
import { WorkReelItem } from "./WorkReelItem";
import { WorkDetailOverlay } from "./WorkDetailOverlay";

gsap.registerPlugin(ScrollTrigger);

type ActiveDetail = {
  project: Project;
  origin: HTMLElement | null;
};

type LineGeometry = {
  stepX: number;
  stepY: number;
  stepZ: number;
  turn: number;
};

type Press = {
  id: number;
  x: number;
  y: number;
  startHead: number;
  lastTime: number;
  engaged: boolean;
};

const LAST_INDEX = projects.length - 1;

// Pinned scroll distance per project, as a fraction of the viewport height.
const STEP_VIEWPORTS = 0.6;

// Fraction at each end of a step during which the shelf holds on a project.
// Kept small so scrolling moves the row continuously instead of hesitating
// and jumping; the scroll-end snap does the resting.
const DWELL = 0.12;

// Spring driving the shelf head, tuned to A24's (frequency ~9.5, light
// underdamping) so the row settles with a small overshoot.
const SPRING_STIFFNESS = 90;
const SPRING_DAMPING = 15;

// Fallback for the diagonal the upcoming planes sit on. The live values come
// from the --shelf-step-* and --shelf-turn custom properties so mobile and
// desktop can space the planes differently. Steps are in card widths.
const DEFAULT_GEOMETRY: LineGeometry = {
  stepX: 0.62,
  stepY: 0.2,
  stepZ: 0.9,
  turn: 12,
};

// Passed planes accelerate off screen to the left, under the credits panel.
const EXIT_STEP_X = 1.35;

// Velocity-linked wave: amplitude (card widths) per unit of head velocity,
// capped, and its spatial frequency along the line.
const WAVE_GAIN = 0.09;
const WAVE_MAX = 0.32;
const WAVE_FREQUENCY = 1.25;

// Depth of field, in px: blur per step behind the front plane, and the
// stronger blur applied as a plane exits.
const DEPTH_BLUR = 2.2;
const EXIT_BLUR = 10;
const MAX_BLUR = 14;

// Idle time after the last scroll update before the shelf snaps to the
// nearest project.
const SNAP_DELAY_MS = 160;

// Horizontal drag. A press becomes a drag after DRAG_START_PX of mostly
// horizontal movement. On release the shelf steps once the flick-projected
// position passes STEP_THRESHOLD of a project from where the drag began.
const DRAG_START_PX = 8;
const STEP_THRESHOLD = 0.22;
const FLICK_PROJECTION_S = 0.15;
const MAX_DRAG_VELOCITY = 12;

// Clicks this soon after a drag are swallowed, so a swipe that ends on a card
// doesn't also select or open it.
const CLICK_SUPPRESS_MS = 350;

function dwell(value: number): number {
  const base = Math.floor(value);
  const fraction = value - base;
  if (fraction <= DWELL) return base;
  if (fraction >= 1 - DWELL) return base + 1;
  const t = (fraction - DWELL) / (1 - DWELL * 2);
  return base + t * t * (3 - 2 * t);
}

const clampIndex = (value: number) =>
  Math.min(LAST_INDEX, Math.max(0, value));

function readGeometry(element: HTMLElement): LineGeometry {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: number) => {
    const value = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    stepX: read("--shelf-step-x", DEFAULT_GEOMETRY.stepX),
    stepY: read("--shelf-step-y", DEFAULT_GEOMETRY.stepY),
    stepZ: read("--shelf-step-z", DEFAULT_GEOMETRY.stepZ),
    turn: read("--shelf-turn", DEFAULT_GEOMETRY.turn),
  };
}

const pad = (value: number) => String(value).padStart(3, "0");

export function WorkVelocityGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const activeRef = useRef(0);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<ActiveDetail | null>(null);

  // Jump the page scroll and let the spring animate the shelf. A smooth
  // Lenis scroll under the spring eased every step twice.
  const goTo = useCallback((index: number) => {
    const trigger = triggerRef.current;
    if (!trigger || LAST_INDEX <= 0) return;
    scrollToY(
      trigger.start +
        (trigger.end - trigger.start) * (clampIndex(index) / LAST_INDEX),
      { immediate: true },
    );
  }, []);

  const openIndex = useCallback((index: number, origin: HTMLElement | null) => {
    const project = projects[index];
    if (project) setDetail({ project, origin });
  }, []);

  // A24 behaviour: clicking the front item opens it, clicking any other item
  // brings it to the front.
  const selectItem = useCallback(
    (index: number, media: HTMLElement) => {
      if (index === activeRef.current) openIndex(index, media);
      else goTo(index);
    },
    [goTo, openIndex],
  );

  const openActive = useCallback(() => {
    const index = activeRef.current;
    const media =
      rowRef.current?.querySelectorAll<HTMLElement>("[data-shelf-media]")[
        index
      ] ?? null;
    openIndex(index, media);
  }, [openIndex]);

  const closeDetail = useCallback(() => setDetail(null), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeRef.current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeRef.current - 1);
      }
    },
    [goTo],
  );

  useEffect(() => {
    const scroll = scrollRef.current;
    const sticky = stickyRef.current;
    const row = rowRef.current;
    if (reducedMotion || !scroll || !sticky || !row) return;

    const items = Array.from(
      row.querySelectorAll<HTMLElement>("[data-shelf-item]"),
    );
    const state = { target: 0, head: 0, velocity: 0 };
    let cardWidth = items[0]?.offsetWidth || 320;
    let geometry = readGeometry(sticky);
    let visible = true;
    let lastActive = activeRef.current;
    let dragging = false;
    let touching = false;
    let suppressClickUntil = 0;
    let press: Press | null = null;

    const positionFor = (index: number, self: ScrollTrigger) =>
      self.start + (self.end - self.start) * (index / LAST_INDEX);

    // Rest on a project once scrolling stops. Without this the shelf can
    // stop mid-step (PageDown, a short flick), leaving the active card half
    // exited and blurred while the next one sits near the front slot.
    let snapTimer = 0;
    const scheduleSnap = (self: ScrollTrigger) => {
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        if (!self.isActive || dragging) return;
        // A finger resting on the screen holds the native scroll mid-step;
        // snapping under it fights the user. Wait until it lifts.
        if (touching) {
          scheduleSnap(self);
          return;
        }
        const position = self.progress * LAST_INDEX;
        const nearest = Math.round(position);
        if (Math.abs(position - nearest) >= 0.002) {
          scrollToY(positionFor(nearest, self), { immediate: true });
        }
      }, SNAP_DELAY_MS);
    };

    const trigger = ScrollTrigger.create({
      trigger: scroll,
      start: "top top",
      end: () =>
        `+=${Math.round(window.innerHeight * STEP_VIEWPORTS * LAST_INDEX)}`,
      pin: sticky,
      pinSpacing: true,
      pinType: "fixed",
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // While dragging, the finger owns the head.
        if (dragging) return;
        state.target = dwell(self.progress * LAST_INDEX);
        scheduleSnap(self);
      },
    });
    triggerRef.current = trigger;
    state.target = dwell(trigger.progress * LAST_INDEX);
    state.head = state.target;

    const layout = () => {
      // The wave's strength follows the head's speed: it ripples through the
      // line while moving and flattens once the shelf settles.
      const speed = Math.abs(state.velocity);
      const amplitude = Math.min(WAVE_MAX, speed * WAVE_GAIN) * cardWidth;
      const phase = performance.now() * 0.004;
      const lean = Math.max(-10, Math.min(10, state.velocity * 2.2));

      items.forEach((item, index) => {
        const offset = index - state.head;
        const distance = Math.abs(offset);
        const ahead = Math.max(0, offset);
        const behind = Math.max(0, -offset);
        const front = Math.max(0, 1 - distance);
        const wave =
          Math.sin(offset * WAVE_FREQUENCY - phase) *
          amplitude *
          Math.min(1, distance + 0.3);
        // Ahead: up the diagonal into the distance. Behind: accelerate off
        // screen to the left, passing under the glass credits.
        const x =
          (ahead * geometry.stepX -
            behind * EXIT_STEP_X * (1 + behind * 0.4)) *
          cardWidth;
        const y = -ahead * geometry.stepY * cardWidth + wave - front * 14;
        const z = -ahead * geometry.stepZ * cardWidth;
        const turn = -geometry.turn - Math.min(1, distance) * 20;
        const roll = (wave / Math.max(cardWidth, 1)) * -14;
        const scale = 0.84 + front * 0.16;
        const blur = Math.min(
          MAX_BLUR,
          behind > 0
            ? behind * EXIT_BLUR
            : Math.max(0, ahead - 0.15) * DEPTH_BLUR,
        );

        item.style.transform =
          `translate(-50%, -50%) ` +
          `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
          `rotateY(${turn.toFixed(2)}deg) ` +
          `rotateX(${(lean * (1 - front * 0.6)).toFixed(2)}deg) ` +
          `rotateZ(${roll.toFixed(2)}deg) ` +
          `scale(${scale.toFixed(4)})`;
        item.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
        item.style.opacity = String(
          Math.min(
            1,
            Math.max(0, behind > 0 ? 1 - behind * 0.45 : 1.6 - ahead * 0.28),
          ),
        );
        item.style.zIndex = String(100 - Math.round(distance * 10));
      });

      // The rail follows the animated head, so it moves with the cards
      // during drags and spring steps rather than jumping with the scroll.
      if (railRef.current && LAST_INDEX > 0) {
        const progress = Math.min(1, Math.max(0.02, state.head / LAST_INDEX));
        railRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }

      const next = clampIndex(Math.round(state.head));
      if (next !== lastActive) {
        lastActive = next;
        activeRef.current = next;
        setActive(next);
      }
    };

    const tick = (_time: number, deltaTime: number) => {
      if (!visible) return;
      if (dragging) {
        // The head follows the finger. Keep laying out so the wave animates,
        // and let the velocity fade if the finger holds still.
        state.velocity *= 0.9;
        layout();
        return;
      }
      const settled =
        Math.abs(state.target - state.head) < 0.0005 &&
        Math.abs(state.velocity) < 0.0005;
      if (settled) {
        if (state.head !== state.target || state.velocity !== 0) {
          state.head = state.target;
          state.velocity = 0;
          layout();
        }
        return;
      }
      const dt = Math.min(deltaTime, 50) / 1000;
      state.velocity +=
        (SPRING_STIFFNESS * (state.target - state.head) -
          SPRING_DAMPING * state.velocity) *
        dt;
      state.head += state.velocity * dt;
      layout();
    };

    layout();
    gsap.ticker.add(tick);

    // Horizontal drag. The cards track the finger directly; on release the
    // page scroll jumps to the chosen project and the spring carries the
    // drag's velocity into the settle. Vertical movement is left to the
    // native page scroll (touch-action: pan-y on the shelf).
    const stepPx = () => Math.max(1, cardWidth * geometry.stepX);

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !trigger.isActive) return;
      press = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startHead: state.head,
        lastTime: event.timeStamp,
        engaged: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;

      if (!press.engaged) {
        const dx = event.clientX - press.x;
        const dy = event.clientY - press.y;
        if (Math.abs(dy) > DRAG_START_PX && Math.abs(dy) >= Math.abs(dx)) {
          press = null;
          return;
        }
        if (Math.abs(dx) < DRAG_START_PX) return;
        // Start measuring from here so the row doesn't jump by the threshold.
        press.engaged = true;
        press.x = event.clientX;
        press.startHead = state.head;
        press.lastTime = event.timeStamp;
        dragging = true;
        window.clearTimeout(snapTimer);
        try {
          sticky.setPointerCapture(event.pointerId);
        } catch {
          // The pointer was already released.
        }
        return;
      }

      const raw = press.startHead - (event.clientX - press.x) / stepPx();
      // Rubber band past the first and last project.
      const head =
        raw < 0
          ? raw * 0.35
          : raw > LAST_INDEX
            ? LAST_INDEX + (raw - LAST_INDEX) * 0.35
            : raw;
      const dt = Math.max(1, event.timeStamp - press.lastTime) / 1000;
      const instant = Math.max(
        -MAX_DRAG_VELOCITY,
        Math.min(MAX_DRAG_VELOCITY, (head - state.head) / dt),
      );
      state.velocity = state.velocity * 0.6 + instant * 0.4;
      state.head = head;
      state.target = head;
      press.lastTime = event.timeStamp;
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      const { engaged, startHead } = press;
      press = null;
      if (!engaged) return;

      dragging = false;
      suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS;

      // A short swipe or flick steps one project; a long drag lands on the
      // nearest project to where the flick would carry it.
      const from = Math.round(startHead);
      const projected = state.head + state.velocity * FLICK_PROJECTION_S;
      let next = Math.round(projected);
      if (next === from && Math.abs(projected - from) > STEP_THRESHOLD) {
        next = from + Math.sign(projected - from);
      }
      const index = clampIndex(next);
      state.target = index;
      scrollToY(positionFor(index, trigger), { immediate: true });
    };

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onTouchStart = () => {
      touching = true;
    };
    const onTouchEnd = (event: TouchEvent) => {
      touching = event.touches.length > 0;
      if (!touching && trigger.isActive && !dragging) scheduleSnap(trigger);
    };

    sticky.addEventListener("pointerdown", onPointerDown);
    sticky.addEventListener("pointermove", onPointerMove);
    sticky.addEventListener("pointerup", onPointerEnd);
    sticky.addEventListener("pointercancel", onPointerEnd);
    sticky.addEventListener("click", onClickCapture, true);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      cardWidth = items[0]?.offsetWidth || cardWidth;
      geometry = readGeometry(sticky);
      layout();
    });
    if (items[0]) resizeObserver.observe(items[0]);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    visibilityObserver.observe(sticky);

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(snapTimer);
      gsap.ticker.remove(tick);
      sticky.removeEventListener("pointerdown", onPointerDown);
      sticky.removeEventListener("pointermove", onPointerMove);
      sticky.removeEventListener("pointerup", onPointerEnd);
      sticky.removeEventListener("pointercancel", onPointerEnd);
      sticky.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      trigger.kill();
      triggerRef.current = null;
      items.forEach((item) => {
        item.style.removeProperty("transform");
        item.style.removeProperty("opacity");
        item.style.removeProperty("z-index");
        item.style.removeProperty("filter");
      });
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <ul className="work-gallery-fallback">
        {projects.map((project) => (
          <li key={project.title} className="work-gallery-fallback__item">
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="work-gallery-fallback__link"
            >
              <span className="work-gallery-fallback__frame">
                {project.image ? (
                  <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 50vw"
                    className="work-gallery-fallback__image"
                  />
                ) : (
                  <span
                    className="work-gallery-fallback__placeholder"
                    aria-hidden="true"
                  >
                    ⌨
                  </span>
                )}
              </span>
              <span className="work-gallery-fallback__info">
                <span className="work-gallery-fallback__title">
                  {project.title}
                </span>
                <span className="work-gallery-fallback__text">
                  {project.description}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  const current = projects[active] ?? projects[0];
  const notes = current.highlights ?? [];

  return (
    <Fragment>
      <div ref={scrollRef} className="work-shelf-scroll">
        <div
          ref={stickyRef}
          className="work-shelf"
          role="region"
          aria-roledescription="carousel"
          aria-label="Selected work"
          onKeyDown={onKeyDown}
        >
          <div className="work-shelf__stage">
            <ul ref={rowRef} className="work-shelf__row">
              {projects.map((project, index) => (
                <WorkReelItem
                  key={project.title}
                  project={project}
                  index={index}
                  isActive={index === active}
                  onSelect={selectItem}
                />
              ))}
            </ul>
          </div>

          <div className="work-shelf__credits" aria-live="polite">
            {/* Keyed on the project so the credits replay their entrance on
                every change, like A24's credits beside the front disc. */}
            <div key={current.title} className="work-shelf__credits-inner">
              <h3 className="work-shelf__title">{current.title}</h3>
              <p className="work-shelf__lead">{current.description}</p>
              <dl className="work-shelf__facts">
                <dt>Client</dt>
                <dd>{current.client}</dd>
                <dt>Discipline</dt>
                <dd>{current.tags.join(", ")}</dd>
                <dt>Source</dt>
                <dd>{current.source === "github" ? "GitHub" : "Behance"}</dd>
              </dl>
              {notes.length > 0 ? (
                <ul className="work-shelf__notes">
                  {notes.slice(0, 2).map((note) => (
                    <li key={note} className="work-shelf__note">
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                className="work-shelf__open"
                onClick={openActive}
              >
                Open case study
              </button>
            </div>
          </div>

          <div className="work-shelf__controls">
            <button
              type="button"
              className="work-shelf__nav"
              aria-label="Previous project"
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
            >
              ←
            </button>
            <button
              type="button"
              className="work-shelf__nav"
              aria-label="Next project"
              disabled={active === LAST_INDEX}
              onClick={() => goTo(active + 1)}
            >
              →
            </button>
            <p className="work-shelf__count">
              {pad(active + 1)}
              <span className="work-shelf__total">/{pad(projects.length)}</span>
            </p>
            <span className="work-shelf__rail" aria-hidden="true">
              <span ref={railRef} className="work-shelf__fill" />
            </span>
            <p className="work-shelf__hint">Scroll, drag or use arrows</p>
          </div>
        </div>
      </div>

      {detail ? (
        <WorkDetailOverlay
          project={detail.project}
          origin={detail.origin}
          onClose={closeDetail}
        />
      ) : null}
    </Fragment>
  );
}
