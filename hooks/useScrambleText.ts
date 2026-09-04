"use client";

import { useEffect, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";

function scrambleFrame(target: string, progress: number): string {
  const revealed = Math.floor(progress * target.length);
  return target
    .split("")
    .map((char, i) => {
      if (char === " ") return " ";
      if (i < revealed) return char;
      return CHARSET[Math.floor(Math.random() * CHARSET.length)];
    })
    .join("");
}

type UseScrambleRevealOptions = {
  text: string;
  active: boolean;
  durationMs?: number;
};

export function useScrambleReveal({
  text,
  active,
  durationMs = 400,
}: UseScrambleRevealOptions) {
  const [display, setDisplay] = useState("");
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(scrambleFrame(text, progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, text, durationMs]);

  return active ? display : "";
}
