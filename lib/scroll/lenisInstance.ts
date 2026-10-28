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

/** Scroll the page to an absolute Y position through the active scroll authority. */
export function scrollToY(y: number, options: { immediate?: boolean } = {}): void {
  const lenis = instance;

  if (lenis) {
    lenis.scrollTo(y, { immediate: options.immediate ?? false, force: true });
    return;
  }

  window.scrollTo({ top: y, behavior: options.immediate ? "auto" : "smooth" });
}

export function pauseScroll(): void {
  instance?.stop();
}

export function resumeScroll(): void {
  instance?.start();
}
