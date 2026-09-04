import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
};

export function Section({
  id,
  title,
  children,
  className = "",
  eyebrow,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`section ${className}`.trim()}
    >
      <div className="container">
        {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
        <h2 id={`${id}-heading`} className="text-section-title">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
