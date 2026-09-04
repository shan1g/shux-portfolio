import type Lenis from "lenis";

let instance: Lenis | null = null;

export function setLenisInstance(next: Lenis | null): void {
  instance = next;
}

export function getLenisInstance(): Lenis | null {
  return instance;
}

export function scrollToTarget(
  target: string | HTMLElement,
  options: { immediate?: boolean } = {},
): void {
  const lenis = instance;

  if (lenis) {
    lenis.scrollTo(target, { immediate: options.immediate ?? false });
    return;
  }

  const element =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;

  element?.scrollIntoView({
    behavior: options.immediate ? "auto" : "smooth",
  });
}

/**
 * Nudge the page by a pixel delta through whichever scroll authority is active.
 * Writing `scrollTop` directly while Lenis is running desyncs its internal
 * target, so drag gestures must route through `lenis.scrollTo`.
 */
export function scrollByDelta(delta: number): void {
  const lenis = instance;

  if (lenis) {
    lenis.scrollTo(lenis.actualScroll + delta, {
      immediate: true,
      force: true,
    });
    return;
  }

  window.scrollBy(0, delta);
}

export function pauseScroll(): void {
  instance?.stop();
}

export function resumeScroll(): void {
  instance?.start();
}
