"use client";

import { useEffect, useState } from "react";

export const READINESS_TIMEOUT_MS = 3500;

// The hero has no heavy assets left to fetch, so the intro only waits for the
// fonts.
export function useAssetReadiness() {
  const [progress, setProgress] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const tasks: Promise<unknown>[] = [document.fonts.ready];

    const total = tasks.length;
    let done = 0;

    for (const task of tasks) {
      void task
        .catch(() => undefined)
        .then(() => {
          if (cancelled) return;
          done += 1;
          setProgress(done / total);
        });
    }

    void Promise.allSettled(tasks).then(() => {
      if (cancelled) return;
      setProgress(1);
      setSettled(true);
    });

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setProgress(1);
      setSettled(true);
    }, READINESS_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { progress, settled };
}
