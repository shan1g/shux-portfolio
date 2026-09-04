const STORAGE_KEY = "shux:audio-muted";

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cached = null;
    notify();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getMutedSnapshot(): boolean {
  if (cached === null) cached = read();
  return cached;
}

export function getMutedServerSnapshot(): boolean {
  return false;
}

export function setMutedPreference(value: boolean): void {
  cached = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Persisting the preference is best-effort only.
  }
  notify();
}
