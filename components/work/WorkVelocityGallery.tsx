"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Project } from "@/lib/projects";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { scrollByDelta } from "@/lib/scroll/lenisInstance";
import { WorkReelItem } from "./WorkReelItem";
import { WorkDetailOverlay } from "./WorkDetailOverlay";

gsap.registerPlugin(ScrollTrigger, Observer);

type ActiveDetail = {
  project: Project;
  origin: HTMLElement | null;
};

export function WorkVelocityGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const [detail, setDetail] = useState<ActiveDetail | null>(null);

  const openDetail = useCallback((project: Project, origin: HTMLElement) => {
    setDetail({ project, origin });
  }, []);

  const closeDetail = useCallback(() => setDetail(null), []);

  useEffect(() => {
    const scroll = scrollRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (reducedMotion || !scroll || !sticky || !track) return;

    const distance = () =>
      Math.max(0, track.scrollWidth - sticky.clientWidth);

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: scroll,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: sticky,
          pinSpacing: true,
          pinType: "fixed",
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const total = projects.length;
            const index = Math.min(
              total,
              Math.max(1, Math.round(self.progress * (total - 1)) + 1),
            );

            if (counterRef.current) {
              const next = String(index).padStart(3, "0");
              if (counterRef.current.textContent !== next) {
                counterRef.current.textContent = next;
              }
            }

            if (railRef.current) {
              railRef.current.style.transform = `scaleX(${Math.max(
                0.02,
                self.progress,
              )})`;
            }
          },
        },
      });
    }, scroll);

    // The pin distance is measured from `track.scrollWidth`, which grows as
    // fonts and reel images decode. Without these refreshes the pin releases
    // early and the reel appears to keep scrolling past its last slide.
    let cancelled = false;

    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    void document.fonts.ready.then(refresh);

    const images = Array.from(track.querySelectorAll("img"));
    const pending = images.filter((image) => !image.complete);

    void Promise.allSettled(
      pending.map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    ).then(refresh);

    return () => {
      cancelled = true;
      ctx.revert();
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

  return (
    <>
      <div ref={scrollRef} className="work-reel-scroll">
        <div ref={stickyRef} className="work-reel-sticky">
          <ul ref={trackRef} className="work-reel">
            {projects.map((project) => (
              <WorkReelItem
                key={project.title}
                project={project}
                onOpen={openDetail}
              />
            ))}
          </ul>

          <div className="work-reel-status">
            <p className="work-reel-status__count">
              <span ref={counterRef}>001</span>
              <span className="work-reel-status__total">
                /{String(projects.length).padStart(3, "0")}
              </span>
            </p>
            <span className="work-reel-status__rail" aria-hidden="true">
              <span ref={railRef} className="work-reel-status__fill" />
            </span>
            <p className="work-reel-status__hint">Scroll or drag</p>
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
    </>
  );
}
