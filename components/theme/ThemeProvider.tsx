"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "shux:theme-change";

// The server can read neither localStorage nor the media query, so it cannot
// know the theme while rendering. The theme is therefore treated as external
// state and read through useSyncExternalStore: the hydrating render uses the
// server snapshot below, and React swaps in the real client snapshot once
// hydration finishes. That avoids both the ThemeToggleOrb hydration mismatch
// and the cascading render a setState-in-effect would cause.
const SERVER_THEME: Theme = "dark";

type ThemeContextValue = {
  theme: Theme;
  // False during SSR and the hydrating render. Consumers use it to hold back
  // theme-dependent markup until the real theme is known.
  resolved: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return SERVER_THEME;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return null;
}

// Writing `data-theme` is reserved for an explicit visitor choice. With no
// choice stored the stylesheet resolves the theme from `prefers-color-scheme`
// (see app/styles/_theme.less), so the attribute must stay off the element or
// it would freeze the page against later system changes.
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#0a0a0b" : "#f8f8fa");
  }
}

function readTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

function readServerTheme(): Theme {
  return SERVER_THEME;
}

function subscribeToTheme(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onStoreChange);
  // setTheme writes localStorage, which fires no event in the tab that wrote
  // it, so it announces itself. `storage` covers other tabs.
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    mq.removeEventListener("change", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

// `resolved` flips exactly once, when React replaces the server snapshot after
// hydration, so it needs no real subscription.
function subscribeToResolved() {
  return () => {};
}

function readResolved() {
  return true;
}

function readServerResolved() {
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    readServerTheme,
  );
  const resolved = useSyncExternalStore(
    subscribeToResolved,
    readResolved,
    readServerResolved,
  );

  // A visitor with a stored choice needs `data-theme` on <html>, otherwise the
  // stylesheet keeps following `prefers-color-scheme` and their choice is
  // ignored until they toggle. With nothing stored the attribute stays off so
  // the media query remains in charge. DOM-only sync — no setState, so this
  // cannot cascade renders.
  useEffect(() => {
    if (getStoredTheme()) applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    // Read through the store rather than closing over `theme`, so a toggle can
    // never act on a stale value.
    setTheme(readTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggleTheme }),
    [theme, resolved, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
