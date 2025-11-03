"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const buttonClassName = `theme-toggle d-inline-flex align-items-center gap-2 fw-semibold ${className}`.trim();

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <span className="theme-toggle__icon d-flex align-items-center justify-content-center">
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="theme-toggle__label">{isDark ? "Modo escuro" : "Modo claro"}</span>
    </button>
  );
}
