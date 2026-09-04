"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Project } from "@/lib/projects";
import { useScrambleReveal } from "@/hooks/useScrambleText";

type WorkReelItemProps = {
  project: Project;
  index: number;
  onOpen: (project: Project, media: HTMLElement) => void;
};

export function WorkReelItem({ project, index, onOpen }: WorkReelItemProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const label = useScrambleReveal({ text: project.title, active: hovered });

  return (
    <li className="work-reel__item" data-work-item>
      <button
        type="button"
        className="work-reel__button"
        aria-label={`Open case study: ${project.title}`}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => {
          if (mediaRef.current) onOpen(project, mediaRef.current);
        }}
      >
        <div ref={mediaRef} className="work-reel__media">
          {project.image ? (
            <Image
              src={project.image}
              alt=""
              fill
              sizes="(max-width: 767px) 78vw, 34vw"
              className="work-reel__image"
              draggable={false}
            />
          ) : (
            <span className="work-reel__placeholder" aria-hidden="true">
              ⌨
            </span>
          )}
          <span className="work-reel__scrim" aria-hidden="true" />
          <span className="work-reel__index">
            {String(index + 1).padStart(3, "0")}
          </span>
          <span className="work-reel__scramble" aria-hidden="true">
            {label}
          </span>
        </div>

        <div className="work-reel__meta">
          <h3 className="work-reel__title">{project.title}</h3>
          <p className="work-reel__tags">{project.tags.join(" / ")}</p>
        </div>
      </button>
    </li>
  );
}
