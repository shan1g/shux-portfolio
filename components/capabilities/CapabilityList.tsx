"use client";

import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { capabilities } from "@/lib/projects";
import { springSoft } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const INSTANT = { duration: 0 };
const REVEAL_EASE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

export function CapabilityList() {
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canHover, setCanHover] = useState(false);
  const baseId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.utils
        .toArray<HTMLElement>("[data-capability-rule]")
        .forEach((rule) => {
          gsap.fromTo(
            rule,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: rule,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            },
          );
        });

      gsap.fromTo(
        "[data-capability-row]",
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: list,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        },
      );
    }, list);

    return () => ctx.revert();
  }, [reducedMotion]);

  // Fine pointers open rows on hover/focus (and close when leaving the list).
  // Touch has no hover, so a tap toggles the row instead.
  const onListBlur = (event: FocusEvent<HTMLUListElement>) => {
    if (!canHover) return;
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setActiveIndex(null);
  };

  const highlightTransition = reducedMotion ? INSTANT : springSoft;
  const revealTransition = reducedMotion ? INSTANT : REVEAL_EASE;

  return (
    <div className="capabilities">
      <ul
        ref={listRef}
        className="capability-list"
        onPointerLeave={canHover ? () => setActiveIndex(null) : undefined}
        onBlur={onListBlur}
      >
        {capabilities.map((capability, index) => {
          const isActive = index === activeIndex;
          const panelId = `${baseId}-panel-${index}`;

          return (
            <li
              key={capability.index}
              className={`capability-row${isActive ? " capability-row--active" : ""}`}
              data-capability-row
              onPointerEnter={canHover ? () => setActiveIndex(index) : undefined}
            >
              <span className="capability-row__rule" data-capability-rule />
              {isActive ? (
                <motion.span
                  layoutId={reducedMotion ? undefined : `${baseId}-highlight`}
                  transition={highlightTransition}
                  className="capability-row__highlight"
                  aria-hidden="true"
                />
              ) : null}
              <h3 className="capability-row__heading">
                <button
                  type="button"
                  className="capability-row__trigger"
                  aria-expanded={isActive}
                  aria-controls={isActive ? panelId : undefined}
                  onFocus={canHover ? () => setActiveIndex(index) : undefined}
                  onClick={() =>
                    setActiveIndex((current) =>
                      !canHover && current === index ? null : index,
                    )
                  }
                >
                  <span className="capability-row__index">
                    {capability.index}
                  </span>
                  <span className="capability-row__title">
                    {capability.title}
                  </span>
                  <motion.span
                    className="capability-row__icon"
                    animate={{ rotate: isActive ? 45 : 0 }}
                    transition={highlightTransition}
                    aria-hidden="true"
                  >
                    +
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isActive ? (
                  <motion.div
                    key="reveal"
                    id={panelId}
                    className="capability-row__reveal"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={revealTransition}
                  >
                    <p className="capability-row__body">{capability.body}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
