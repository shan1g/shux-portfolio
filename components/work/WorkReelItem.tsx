"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Project } from "@/lib/projects";

type WorkReelItemProps = {
  project: Project;
  onOpen: (project: Project, media: HTMLElement) => void;
};

export function WorkReelItem({ project, onOpen }: WorkReelItemProps) {
  const mediaRef = useRef<HTMLDivElement>(null);

  return (
    <li className="work-reel__item" data-work-item>
      <button
        type="button"
        className="work-reel__button"
        aria-label={`Open case study: ${project.title}`}
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
        </div>

        <div className="work-reel__meta">
          <h3 className="work-reel__title">{project.title}</h3>
          <p className="work-reel__tags">{project.tags.join(" / ")}</p>
        </div>
      </button>
    </li>
  );
}
