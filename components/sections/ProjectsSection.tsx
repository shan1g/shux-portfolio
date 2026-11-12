"use client";

import { WorkVelocityGallery } from "@/components/work/WorkVelocityGallery";

export function ProjectsSection() {
  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="section section--carousel section--pinned"
    >
      <div className="container">
        <p className="text-eyebrow">Projects</p>
        <h2 id="work-heading" className="text-section-title">
          Selected Work
        </h2>
      </div>
      <WorkVelocityGallery />
    </section>
  );
}
