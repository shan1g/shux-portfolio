export const INTRO_COMPLETE_EVENT = "shux:intro-complete";

let completed = false;

export function emitIntroComplete() {
  if (completed) return;
  completed = true;
  window.dispatchEvent(new CustomEvent(INTRO_COMPLETE_EVENT));
}

export function isIntroComplete() {
  return completed;
}

export function onIntroComplete(handler: () => void): () => void {
  if (completed) {
    handler();
    return () => {};
  }

  const listener = () => handler();
  window.addEventListener(INTRO_COMPLETE_EVENT, listener, { once: true });
  return () => window.removeEventListener(INTRO_COMPLETE_EVENT, listener);
}
