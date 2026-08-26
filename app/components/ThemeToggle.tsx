"use client";

import { useCallback, type MouseEvent } from "react";

export default function ThemeToggle() {
  const toggle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const x = e.clientX;
    const y = e.clientY;

    const root = document.documentElement;
    root.style.setProperty("--toggle-x", `${x}px`);
    root.style.setProperty("--toggle-y", `${y}px`);

    const isDark = root.classList.contains("dark");

    // Fallback for browsers without View Transitions
    if (
      !("startViewTransition" in document) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      root.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "light" : "dark");
      return;
    }

    const doc = document as Document & {
      startViewTransition: (cb: () => void) => void;
    };

    doc.startViewTransition(() => {
      root.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "light" : "dark");
    });
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="fixed top-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full
                text-[var(--fg-muted)] transition-colors duration-200
                hover:text-[var(--fg)] cursor-pointer"
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        className="hidden dark:block h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon icon (shown in light mode) */}
      <svg
        className="block dark:hidden h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
