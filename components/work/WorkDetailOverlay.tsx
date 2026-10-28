"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import type { Project } from "@/lib/projects";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { pauseScroll, resumeScroll } from "@/lib/scroll/lenisInstance";

gsap.registerPlugin(Flip);

type WorkDetailOverlayProps = {
  project: Project;
  origin: HTMLElement | null;
  onClose: () => void;
};

export function WorkDetailOverlay({
  project,
  origin,
  onClose,
}: WorkDetailOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const chapters = project.chapters ?? [];
  const highlights = project.highlights ?? [];

  const close = useCallback(() => {
    const root = rootRef.current;

    if (reducedMotion || !root) {
      onClose();
      return;
    }

    gsap.to(root, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      onComplete: onClose,
    });
  }, [onClose, reducedMotion]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    pauseScroll();
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      resumeScroll();
      previousFocus?.focus();
    };
  }, [close]);

  useEffect(() => {
    const root = rootRef.current;
    const media = mediaRef.current;
    if (!root) return;

    if (reducedMotion) {
      gsap.set(root, { autoAlpha: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(root, { autoAlpha: 1 });

      gsap.from("[data-overlay-fade]", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.06,
        ease: "power3.out",
        delay: 0.2,
      });

      if (media && origin && origin.isConnected) {
        Flip.fit(media, origin, { scale: true });
        const state = Flip.getState(media);
        gsap.set(media, { clearProps: "transform,width,height" });
        Flip.from(state, {
          duration: 0.75,
          ease: "power3.inOut",
          scale: true,
        });
      } else {
        gsap.from(media, {
          opacity: 0,
          scale: 1.04,
          duration: 0.6,
          ease: "power3.out",
        });
      }
    }, root);

    return () => ctx.revert();
  }, [origin, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onFocusIn = (event: FocusEvent) => {
      if (!root.contains(event.target as Node)) {
        closeRef.current?.focus();
      }
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-detail-title"
      className="work-detail"
    >
      <button
        type="button"
        className="work-detail__backdrop"
        aria-label="Close case study"
        tabIndex={-1}
        onClick={close}
      />

      {/* The panel is the scroll container, so long case studies scroll
          instead of being clipped. Lenis is paused while the dialog is open
          and `data-lenis-prevent` hands wheel and touch back to the browser. */}
      <div className="work-detail__panel" data-lenis-prevent>
        <header className="work-detail__bar">
          <button
            ref={closeRef}
            type="button"
            className="work-detail__close"
            onClick={close}
          >
            Close
          </button>
        </header>

        <div ref={mediaRef} className="work-detail__media">
          {project.image ? (
            <Image
              src={project.image}
              alt=""
              fill
              sizes="(max-width: 1023px) 100vw, 55vw"
              priority
              className="work-detail__image"
            />
          ) : (
            <span className="work-detail__placeholder" aria-hidden="true">
              ⌨
            </span>
          )}
        </div>

        <div className="work-detail__body">
          <h2
            id="work-detail-title"
            className="work-detail__title"
            data-overlay-fade
          >
            {project.title}
          </h2>
          <p className="work-detail__lead" data-overlay-fade>
            {project.description}
          </p>

          {highlights.length > 0 ? (
            <ul className="work-detail__highlights" data-overlay-fade>
              {highlights.map((highlight) => (
                <li key={highlight} className="work-detail__highlight">
                  {highlight}
                </li>
              ))}
            </ul>
          ) : null}

          {chapters.length > 0 ? (
            <ul className="work-detail__chapters">
              {chapters.map((chapter) => (
                <li
                  key={chapter.label}
                  className="work-detail__chapter"
                  data-overlay-fade
                >
                  <p className="work-detail__chapter-label">{chapter.label}</p>
                  <p className="work-detail__chapter-body">{chapter.body}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="work-detail__tags" data-overlay-fade>
            {project.tags.map((tag) => (
              <li key={tag} className="work-detail__tag">
                {tag}
              </li>
            ))}
          </ul>

          <a
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            className="work-detail__link"
            data-overlay-fade
          >
            {project.source === "github"
              ? "View the project"
              : "View full project on Behance"}
          </a>
        </div>
      </div>
    </div>
  );
}
