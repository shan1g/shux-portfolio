"use client";

import { Fragment, useEffect, useId, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onIntroComplete } from "@/lib/intro/introEvents";
import {
  CELL_H,
  PAD,
  layoutWord,
  segmentAt,
  type WordLayout,
} from "@/lib/hero/segmentType/glyphs";
import {
  FRINGE,
  PANE_INSET,
  PANE_RADIUS,
  lensTransform,
  panesFor,
  r2,
  type GlassPane,
} from "@/lib/hero/segmentType/glass";

gsap.registerPlugin(ScrollTrigger);

const WORDS = ["SHAN", "GRAY"].map(layoutWord);
// In DOM order: every lit segment of the first word, then the second's.
const LIT = WORDS.flatMap((word) => word.lit);
const PANES = WORDS.map((word, i) => panesFor(i, word.width - PAD * 2));

// The weight grows a little over this stretch of the hero pin; the panes
// slide across the whole of it.
const WEIGHT_START = 0.04;
const WEIGHT_END = 0.8;

// How far the colour channels split at a pane's edges, and how far the
// frosted panes smear sideways (glyph units).
const LENS_SPLIT = 1.4;
const SMEAR_SPLIT = 2;
const SMEAR_BLUR = "6 0.6";

type PaneElements = {
  pane: GlassPane;
  // The pane's slab, its clip and its hole in the plain lettering: all slide together.
  parts: SVGElement[];
  // The letters seen through it.
  lens: SVGUseElement | null;
};

function paint(
  lines: SVGLineElement[],
  ghosts: SVGGElement[],
  panes: PaneElements[],
  weight: number,
  slide: number,
) {
  lines.forEach((line, i) => {
    const s = LIT[i];
    if (!s) return;
    const p = segmentAt(s, weight);
    line.setAttribute("x1", String(p.x1));
    line.setAttribute("y1", String(p.y1));
    line.setAttribute("x2", String(p.x2));
    line.setAttribute("y2", String(p.y2));
    line.setAttribute("stroke-width", String(p.width));
  });
  // The unlit segments belong to the thin LED look; they dim as it fills in.
  const ghost = String(Math.max(0, 1 - weight * 0.7));
  for (const g of ghosts) g.style.opacity = ghost;

  for (const { pane, parts, lens } of panes) {
    const dx = pane.drift * slide;
    const t = `translate(${r2(dx)} 0)`;
    for (const el of parts) el.setAttribute("transform", t);
    lens?.setAttribute("transform", lensTransform(pane, dx));
  }
}

// Splits a filter input into its red, green and blue channels and slides
// red left and blue right, so edges seen through the glass fringe.
function ChannelSplit({ input, spread }: { input: string; spread: number }) {
  return (
    <Fragment>
      <feColorMatrix
        in={input}
        type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="red"
      />
      <feOffset in="red" dx={-spread} dy={0} result="redShift" />
      <feColorMatrix
        in={input}
        type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="green"
      />
      <feColorMatrix
        in={input}
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
        result="blue"
      />
      <feOffset in="blue" dx={spread} dy={0} result="blueShift" />
      <feBlend in="redShift" in2="green" mode="screen" result="redGreen" />
      <feBlend in="redGreen" in2="blueShift" mode="screen" />
    </Fragment>
  );
}

function SegmentWord({ word, index }: { word: WordLayout; index: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `hero-type-${uid}`;
  const lettersId = `hero-type-letters-${uid}`;
  const maskId = `hero-type-mask-${uid}`;
  const sheenId = `hero-glass-sheen-${uid}`;
  const lensId = `hero-glass-lens-${uid}`;
  const smearId = `hero-glass-smear-${uid}`;
  const clipId = (i: number) => `hero-glass-clip-${uid}-${i}`;
  const panes = PANES[index] ?? [];
  const key = (i: number) => `${index}-${i}`;

  return (
    <svg
      className="hero-type__word"
      viewBox={word.viewBox}
      style={{ aspectRatio: `${word.width} / ${word.height}` }}
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={-PAD}
          y1={0}
          x2={word.width - PAD}
          y2={CELL_H}
        >
          <stop offset="0" className="hero-type__stop-a" />
          <stop offset="1" className="hero-type__stop-b" />
        </linearGradient>
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="hero-glass__sheen-hi" />
          <stop offset="0.45" className="hero-glass__sheen-lo" />
          <stop offset="1" className="hero-glass__sheen-mid" />
        </linearGradient>
        <filter
          id={lensId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <ChannelSplit input="SourceGraphic" spread={LENS_SPLIT} />
        </filter>
        <filter
          id={smearId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={SMEAR_BLUR}
            result="smear"
          />
          <ChannelSplit input="smear" spread={SMEAR_SPLIT} />
        </filter>
        {/* The plain lettering, with a hole wherever a pane covers it. */}
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-PAD - 100}
          y={-PAD - 100}
          width={word.width + 200}
          height={word.height + 200}
        >
          <rect
            x={-PAD - 100}
            y={-PAD - 100}
            width={word.width + 200}
            height={word.height + 200}
            fill="#fff"
          />
          {panes.map((p, i) => (
            <rect
              key={i}
              data-pane={key(i)}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
              fill="#000"
            />
          ))}
        </mask>
        {panes.map((p, i) => (
          <clipPath key={i} id={clipId(i)}>
            <rect
              data-pane={key(i)}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
            />
          </clipPath>
        ))}
      </defs>

      <g mask={`url(#${maskId})`}>
        <g id={lettersId}>
          <g className="hero-type__ghosts" data-ghost>
            {word.unlit.map((s, i) => {
              const p = segmentAt(s, 0);
              return (
                <line
                  key={i}
                  x1={p.x1}
                  y1={p.y1}
                  x2={p.x2}
                  y2={p.y2}
                  strokeWidth={p.width}
                />
              );
            })}
          </g>
          <g className="hero-type__lit" stroke={`url(#${gradientId})`}>
            {word.lit.map((s, i) => {
              const p = segmentAt(s, 0);
              return (
                <line
                  key={i}
                  className="hero-type__seg"
                  data-seg
                  x1={p.x1}
                  y1={p.y1}
                  x2={p.x2}
                  y2={p.y2}
                  strokeWidth={p.width}
                />
              );
            })}
          </g>
        </g>
      </g>

      {panes.map((p, i) => (
        <g key={i} className={`hero-glass hero-glass--${p.kind}`}>
          {/* The letters seen through the pane: a live copy of the lettering, refracted. */}
          <g clipPath={`url(#${clipId(i)})`}>
            <g filter={`url(#${p.kind === "smear" ? smearId : lensId})`}>
              <use
                href={`#${lettersId}`}
                data-lens={key(i)}
                transform={lensTransform(p, 0)}
              />
            </g>
          </g>
          {/* The slab itself. */}
          <g data-pane={key(i)}>
            <rect
              className="hero-glass__tint"
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
            />
            <rect
              className="hero-glass__sheen"
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
              fill={`url(#${sheenId})`}
            />
            <rect
              className="hero-glass__fringe-r"
              x={p.x - FRINGE}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              className="hero-glass__fringe-b"
              x={p.x + FRINGE}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              className="hero-glass__rim"
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={PANE_RADIUS}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              className="hero-glass__inner"
              x={p.x + PANE_INSET}
              y={p.y + PANE_INSET}
              width={p.w - PANE_INSET * 2}
              height={p.h - PANE_INSET * 2}
              rx={PANE_RADIUS / 2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

// "SHAN GRAY" in seven-segment lettering after the Mux typeface, seen through
// glass panes. Decorative: the page's h1 carries the name for assistive tech.
// Scrolling through the hero thickens the segments a little and slides each
// pane across the name at its own speed, so the refracted letters move
// through the glass.
export function HeroSegmentType({
  trackRef,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const lines = Array.from(
      root.querySelectorAll<SVGLineElement>("[data-seg]"),
    );
    const ghosts = Array.from(root.querySelectorAll<SVGGElement>("[data-ghost]"));
    const panes: PaneElements[] = PANES.flatMap((wordPanes, wi) =>
      wordPanes.map((pane, pi) => ({
        pane,
        parts: Array.from(
          root.querySelectorAll<SVGElement>(`[data-pane="${wi}-${pi}"]`),
        ),
        lens: root.querySelector<SVGUseElement>(`[data-lens="${wi}-${pi}"]`),
      })),
    );

    paint(lines, ghosts, panes, 0, 0);

    // Reduced motion: the thin weight, the panes where they start, held still.
    if (reducedMotion) return;

    const state = { weight: 0, slide: 0 };
    const update = () =>
      paint(lines, ghosts, panes, state.weight, state.slide);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      // segmentAt eases the weight itself, so the tweens stay linear.
      tl.to(
        state,
        {
          weight: 1,
          duration: WEIGHT_END - WEIGHT_START,
          ease: "none",
          onUpdate: update,
        },
        WEIGHT_START,
      );
      tl.to(state, { slide: 1, duration: 1, ease: "none", onUpdate: update }, 0);
    }, root);

    // As the intro lifts, the display warms up: every segment dims, then
    // they come on one by one in random order. The copies behind the glass
    // follow, as they mirror the originals.
    const offIntro = onIntroComplete(() => {
      ctx.add(() => {
        gsap.fromTo(
          lines,
          { opacity: 0.12 },
          {
            opacity: 1,
            duration: 0.08,
            ease: "steps(2)",
            stagger: { each: 0.018, from: "random" },
            clearProps: "opacity",
          },
        );
      });
    });

    return () => {
      offIntro();
      ctx.revert();
    };
  }, [trackRef, reducedMotion]);

  return (
    <div ref={rootRef} className="hero-type" aria-hidden="true">
      {WORDS.map((word, i) => (
        <SegmentWord key={word.text} word={word} index={i} />
      ))}
    </div>
  );
}
