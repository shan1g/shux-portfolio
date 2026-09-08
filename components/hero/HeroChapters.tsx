"use client";

export const HERO_CHAPTERS = [
  {
    index: "01",
    title: "Clarity is the feature",
    body: "Remove friction before you add delight. Every screen answers one question: what happens next?",
  },
  {
    index: "02",
    title: "Motion carries meaning",
    body: "Animation guides attention and confirms action — never decoration for its own sake.",
  },
  {
    index: "03",
    title: "Native on every screen",
    body: "Built for thumbs and safe areas first. Desktop inherits that calm, app-like flow.",
  },
  {
    index: "04",
    title: "Craft is the difference",
    body: "Typography, timing, and detail — the things people feel before they can name them.",
  },
];

type HeroChaptersProps = {
  reducedMotion?: boolean;
};

export function HeroChapters({ reducedMotion = false }: HeroChaptersProps) {
  const chapters = reducedMotion ? HERO_CHAPTERS.slice(0, 1) : HERO_CHAPTERS;

  return (
    <ul
      className={`hero-chapters${reducedMotion ? " hero-chapters--static" : ""}`}
    >
      {chapters.map((chapter) => (
        <li key={chapter.index} className="hero-chapter" data-hero-chapter>
          <p className="hero-chapter__title">{chapter.title}</p>
          <p className="hero-chapter__body">{chapter.body}</p>
        </li>
      ))}
    </ul>
  );
}
