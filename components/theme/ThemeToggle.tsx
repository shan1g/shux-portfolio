"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, resolved, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Same constraint as ThemeToggleOrb: no theme-dependent markup before the
  // theme is resolved after mount, or server and client renders disagree.
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={resolved ? isDark : undefined}
      aria-label={
        resolved
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle colour theme"
      }
      className="theme-toggle"
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {!resolved ? null : isDark ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>
      <span>{resolved ? (isDark ? "Light mode" : "Dark mode") : "Theme"}</span>
    </button>
  );
}
