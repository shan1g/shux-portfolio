"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { capabilities } from "@/lib/projects";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const ACTIVE_ROW_CLASS = "capability-row--active";

export function CapabilityList() {
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();

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

  useEffect(() => {
    const list = listRef.current;
    if (!list || reducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const rows = gsap.utils.toArray<HTMLElement>("[data-capability-row]", list);

    const cleanups = rows.map((row) => {
      const reveal = row.querySelector<HTMLElement>("[data-capability-reveal]");
      const body = row.querySelector<HTMLElement>("[data-capability-body]");
      if (!reveal || !body) return () => {};

      gsap.set(reveal, { height: 0, overflow: "hidden" });
      gsap.set(body, { opacity: 0, y: 12 });

      const open = () => {
        rows.forEach((other) => other.classList.remove(ACTIVE_ROW_CLASS));
        row.classList.add(ACTIVE_ROW_CLASS);

        gsap.to(reveal, {
          height: "auto",
          duration: 0.5,
          ease: "power3.out",
          overwrite: true,
        });
        gsap.to(body, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power3.out",
          overwrite: true,
        });
      };

      const close = () => {
        row.classList.remove(ACTIVE_ROW_CLASS);

        gsap.to(body, {
          opacity: 0,
          y: 12,
          duration: 0.3,
          ease: "power2.in",
          overwrite: true,
        });
        gsap.to(reveal, {
          height: 0,
          duration: 0.4,
          ease: "power3.inOut",
          overwrite: true,
        });
      };

      const onFocusIn = () => open();
      const onFocusOut = (event: FocusEvent) => {
        const next = event.relatedTarget as Node | null;
        if (next && row.contains(next)) return;
        close();
      };

      row.addEventListener("pointerenter", open);
      row.addEventListener("pointerleave", close);
      row.addEventListener("focusin", onFocusIn);
      row.addEventListener("focusout", onFocusOut);

      return () => {
        row.removeEventListener("pointerenter", open);
        row.removeEventListener("pointerleave", close);
        row.removeEventListener("focusin", onFocusIn);
        row.removeEventListener("focusout", onFocusOut);
        row.classList.remove(ACTIVE_ROW_CLASS);
        gsap.killTweensOf([reveal, body]);
        gsap.set(reveal, { clearProps: "all" });
        gsap.set(body, { clearProps: "all" });
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [reducedMotion]);

  return (
    <div className="capabilities">
      <ul ref={listRef} className="capability-list">
        {capabilities.map((capability) => (
          <li
            key={capability.index}
            className="capability-row"
            data-capability-row
            tabIndex={0}
          >
            <span className="capability-row__rule" data-capability-rule />
            <div className="capability-row__content">
              <h3 className="capability-row__title">{capability.title}</h3>
              <div className="capability-row__reveal" data-capability-reveal>
                <p className="capability-row__body" data-capability-body>
                  {capability.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
