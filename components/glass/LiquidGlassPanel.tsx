"use client";

import type { CSSProperties, ReactNode } from "react";
import { refractive } from "@hashintel/refractive";
import type { GlassShape } from "@/lib/glass/displacement";

type LiquidGlassPanelProps = {
  children: ReactNode;
  className?: string;
  borderRadius?: number;
  refractionLevel?: number;
  shape?: GlassShape;
};

function getRefractiveRadius(shape: GlassShape, borderRadius: number): number {
  if (shape === "circle") return 28;
  return Math.min(borderRadius, 48);
}

export function LiquidGlassPanel({
  children,
  className = "",
  borderRadius = 24,
  refractionLevel = 0.65,
  shape = "roundedRect",
}: LiquidGlassPanelProps) {
  const isCircle = shape === "circle";
  const refractiveRadius = getRefractiveRadius(shape, borderRadius);

  const style: CSSProperties = {
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    boxShadow: `inset 0 1px 0 var(--glass-highlight), 0 8px 32px var(--glass-shadow)`,
  };

  const highlightStyle: CSSProperties = {
    borderRadius,
    background: isCircle
      ? "radial-gradient(circle at 30% 20%, var(--glass-highlight-strong), transparent 55%)"
      : "linear-gradient(135deg, var(--glass-highlight) 0%, transparent 45%, color-mix(in srgb, var(--glass-highlight) 40%, transparent) 100%)",
  };

  return (
    <refractive.div
      className={`liquid-glass-panel ${className}`.trim()}
      style={style}
      refraction={{
        radius: refractiveRadius,
        blur: refractionLevel * 6,
        bezelWidth: Math.min(refractiveRadius * 0.4, 20),
      }}
    >
      <div
        aria-hidden="true"
        className="liquid-glass-panel__highlight"
        style={highlightStyle}
      />
      <div className="liquid-glass-panel__content" style={{ borderRadius }}>
        {children}
      </div>
    </refractive.div>
  );
}
