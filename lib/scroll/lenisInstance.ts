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
 * Scroll to an in-page section and move keyboard focus to it, so the next Tab
 * continues from the section rather than from the link that was used.
 * Returns false when the section does not exist.
 */
export function scrollToSection(
  id: string,
  options: { immediate?: boolean } = {},
): boolean {
  const element = document.getElementById(id);
  if (!element) return false;

  scrollToTarget(element, options);
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
  return true;
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
