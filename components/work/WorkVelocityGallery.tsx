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
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Project } from "@/lib/projects";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { scrollByDelta, scrollToY } from "@/lib/scroll/lenisInstance";
import { WorkReelItem } from "./WorkReelItem";
import { WorkDetailOverlay } from "./WorkDetailOverlay";

gsap.registerPlugin(ScrollTrigger, Observer);

type ActiveDetail = {
  project: Project;
  origin: HTMLElement | null;
};

const LAST_INDEX = projects.length - 1;

// Pinned scroll distance per project, as a fraction of the viewport height.
const STEP_VIEWPORTS = 0.6;

// Fraction at each end of a step during which the shelf holds on a project.
// Without it the row drifts continuously instead of resting on each title.
const DWELL = 0.22;

// Spring driving the shelf head, tuned to A24's (frequency ~9.5, light
// underdamping) so the row settles with a small overshoot.
const SPRING_STIFFNESS = 90;
const SPRING_DAMPING = 15;

// Upcoming planes line up on a diagonal that rises into the distance, like the
// motion.dev "Scroll velocity: 3D planes" example. Units are card widths.
const LINE_STEP_X = 0.62;
const LINE_STEP_Y = 0.2;
const LINE_STEP_Z = 0.9;

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

function dwell(value: number): number {
  const base = Math.floor(value);
  const fraction = value - base;
  if (fraction <= DWELL) return base;
  if (fraction >= 1 - DWELL) return base + 1;
  const t = (fraction - DWELL) / (1 - DWELL * 2);
  return base + t * t * (3 - 2 * t);
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

  const goTo = useCallback((index: number) => {
    const trigger = triggerRef.current;
    if (!trigger || LAST_INDEX <= 0) return;
    const clamped = Math.min(LAST_INDEX, Math.max(0, index));
    scrollToY(
      trigger.start + (trigger.end - trigger.start) * (clamped / LAST_INDEX),
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
    let visible = true;
    let lastActive = activeRef.current;

    // Rest on a project once scrolling stops. Without this the shelf can
    // stop mid-step (PageDown, a short flick), leaving the active card half
    // exited and blurred while the next one sits near the front slot.
    let snapTimer = 0;
    const scheduleSnap = (self: ScrollTrigger) => {
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        if (!self.isActive) return;
        const position = self.progress * LAST_INDEX;
        const nearest = Math.round(position);
        if (Math.abs(position - nearest) >= 0.002) {
          scrollToY(
            self.start + (self.end - self.start) * (nearest / LAST_INDEX),
          );
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
        state.target = dwell(self.progress * LAST_INDEX);
        scheduleSnap(self);
        if (railRef.current) {
          railRef.current.style.transform = `scaleX(${Math.max(
            0.02,
            self.progress,
          )})`;
        }
      },
    });
    triggerRef.current = trigger;
    state.target = dwell(trigger.progress * LAST_INDEX);
    state.head = state.target;

    const layout = () => {
      // The wave's strength follows the head's speed: it ripples through the
      // line while scrolling and flattens once the shelf settles.
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
          (ahead * LINE_STEP_X - behind * EXIT_STEP_X * (1 + behind * 0.4)) *
          cardWidth;
        const y = -ahead * LINE_STEP_Y * cardWidth + wave - front * 14;
        const z = -ahead * LINE_STEP_Z * cardWidth;
        const turn = -12 - Math.min(1, distance) * 20;
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

      const next = Math.min(LAST_INDEX, Math.max(0, Math.round(state.head)));
      if (next !== lastActive) {
        lastActive = next;
        activeRef.current = next;
        setActive(next);
      }
    };

    const tick = (_time: number, deltaTime: number) => {
      if (!visible) return;
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

    const resizeObserver = new ResizeObserver(() => {
      cardWidth = items[0]?.offsetWidth || cardWidth;
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

  useEffect(() => {
    const sticky = stickyRef.current;
    if (reducedMotion || !sticky || detail) return;

    const observer = Observer.create({
      target: sticky,
      type: "touch,pointer",
      dragMinimum: 6,
      tolerance: 8,
      onChangeX: (self) => {
        scrollByDelta(-self.deltaX * 1.4);
      },
    });

    return () => observer.kill();
  }, [reducedMotion, detail]);

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
