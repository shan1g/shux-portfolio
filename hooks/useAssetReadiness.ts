"use client";

import { useEffect, useState } from "react";
import { isWebGPUSupported } from "@/lib/hero/vgpuGlass/isWebGPUSupported";

const HERO_ASSET_URLS = [
  "/hero/glass-fractal/rounded-tetrahedron.mesh",
  "/hero/glass-fractal/fractal-tetrahedron-l7.mesh",
  "/hero/glass-fractal/studio-cubemap-prefiltered.png",
];

export const READINESS_TIMEOUT_MS = 3500;

export function useAssetReadiness() {
  const [progress, setProgress] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const tasks: Promise<unknown>[] = [
      document.fonts.ready,
      isWebGPUSupported(),
      ...HERO_ASSET_URLS.map((url) =>
        fetch(url, { signal: controller.signal, cache: "force-cache" }),
      ),
    ];

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
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return { progress, settled };
}
