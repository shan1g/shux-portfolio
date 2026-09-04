import type { TriangleLedMode } from "./types";

/** Map full-document scroll progress (0–1) to triangle LED edge highlight mode. */
export function pageProgressToLedMode(progress: number): TriangleLedMode {
  const t = Math.min(1, Math.max(0, progress));
  const step = Math.min(3, Math.max(0, Math.floor(t * 4)));
  return (step - 1) as TriangleLedMode;
}
