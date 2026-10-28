"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Project } from "@/lib/projects";

type WorkReelItemProps = {
  project: Project;
  index: number;
  isActive: boolean;
  onSelect: (index: number, media: HTMLElement) => void;
};

/**
 * One card on the Selected Work shelf. The shelf writes this item's 3D
 * transform every frame, so React only owns its content and active state.
 */
export function WorkReelItem({
  project,
  index,
  isActive,
  onSelect,
}: WorkReelItemProps) {
  const mediaRef = useRef<HTMLSpanElement>(null);

  return (
    <li
      className={`work-shelf__item${isActive ? " work-shelf__item--active" : ""}`}
      data-shelf-item
    >
      <button
        type="button"
        className="work-shelf__card"
        aria-label={
          isActive
            ? `Open case study: ${project.title}`
            : `Show ${project.title}`
        }
        aria-current={isActive ? "true" : undefined}
        onClick={() => {
          if (mediaRef.current) onSelect(index, mediaRef.current);
        }}
      >
        <span ref={mediaRef} className="work-shelf__media" data-shelf-media>
          {project.image ? (
            <Image
              src={project.image}
              alt=""
              fill
              sizes="(max-width: 767px) 68vw, 30vw"
              className="work-shelf__image"
              draggable={false}
            />
          ) : (
            <span className="work-shelf__placeholder" aria-hidden="true">
              ⌨
            </span>
          )}
          <span className="work-shelf__sheen" aria-hidden="true" />
          <span className="work-shelf__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          {isActive ? (
            <span className="work-shelf__badge" aria-hidden="true">
              View project
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
