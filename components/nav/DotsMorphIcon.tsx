"use client";

import { motion } from "motion/react";
import { springSnappy } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const DOT = 5;
const GAP = 6;
const SIZE = DOT * 2 + GAP;

type DotsMorphIconProps = {
  open: boolean;
};

export function DotsMorphIcon({ open }: DotsMorphIconProps) {
  const reducedMotion = useReducedMotion();

  const dotPositions = [
    { cx: DOT / 2, cy: DOT / 2 },
    { cx: DOT / 2 + GAP + DOT, cy: DOT / 2 },
    { cx: DOT / 2, cy: DOT / 2 + GAP + DOT },
    { cx: DOT / 2 + GAP + DOT, cy: DOT / 2 + GAP + DOT },
  ];

  const linePaths = [
    `M ${DOT / 2} ${DOT / 2} L ${DOT / 2 + GAP + DOT} ${DOT / 2 + GAP + DOT}`,
    `M ${DOT / 2 + GAP + DOT} ${DOT / 2} L ${DOT / 2} ${DOT / 2 + GAP + DOT}`,
    `M ${SIZE / 2} ${DOT / 2} L ${SIZE / 2} ${DOT / 2 + GAP + DOT}`,
    `M ${DOT / 2} ${SIZE / 2} L ${DOT / 2 + GAP + DOT} ${SIZE / 2}`,
  ];

  if (reducedMotion) {
    return (
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        {open ? (
          <>
            <line
              x1={DOT / 2}
              y1={DOT / 2}
              x2={DOT / 2 + GAP + DOT}
              y2={DOT / 2 + GAP + DOT}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={DOT / 2 + GAP + DOT}
              y1={DOT / 2}
              x2={DOT / 2}
              y2={DOT / 2 + GAP + DOT}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          dotPositions.map((d, i) => (
            <circle
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={DOT / 2 - 0.5}
              fill="currentColor"
            />
          ))
        )}
      </svg>
    );
  }

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      {dotPositions.map((d, i) => (
        <motion.circle
          key={`dot-${i}`}
          fill="currentColor"
          initial={{
            cx: d.cx,
            cy: d.cy,
            opacity: 1,
            r: DOT / 2 - 0.5,
          }}
          animate={{
            cx: open ? SIZE / 2 : d.cx,
            cy: open ? SIZE / 2 : d.cy,
            opacity: open ? 0 : 1,
            r: DOT / 2 - 0.5,
          }}
          transition={springSnappy}
        />
      ))}
      {linePaths.slice(0, 2).map((d, i) => (
        <motion.path
          key={`line-${i}`}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: open ? 1 : 0,
            opacity: open ? 1 : 0,
          }}
          transition={springSnappy}
        />
      ))}
    </svg>
  );
}
