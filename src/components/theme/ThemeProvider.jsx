"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "uai:theme";
const ThemeContext = createContext(null);

function resolvePreferredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(theme) {
  if (typeof document === "undefined") {
    return;
  }

  const { body, documentElement } = document;
  body.classList.remove("theme-light", "theme-dark");
  body.classList.add(`theme-${theme}`);
  documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    typeof window === "undefined" ? "light" : resolvePreferredTheme(),
  );
  const isHydrationComplete = useRef(false);

  useEffect(() => {
    if (isHydrationComplete.current) {
      return;
    }
    isHydrationComplete.current = true;
    if (typeof window === "undefined") {
      return;
    }
    const preferredTheme = resolvePreferredTheme();
    if (preferredTheme !== theme) {
      // Necessário para sincronizar o tema após a hidratação quando a preferência do usuário
      // diverge do padrão renderizado no servidor.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(preferredTheme);
    }
  }, [theme]);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handlePreferenceChange = (event) => {
      if (window.localStorage.getItem(STORAGE_KEY)) {
        return;
      }
      setThemeState(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handlePreferenceChange);
    return () => mediaQuery.removeEventListener("change", handlePreferenceChange);
  }, []);

  const persistTheme = useCallback((nextTheme) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }, []);

  const setTheme = useCallback(
    (nextTheme) => {
      setThemeState(nextTheme);
      persistTheme(nextTheme);
    },
    [persistTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      persistTheme(nextTheme);
      return nextTheme;
    });
  }, [persistTheme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return context;
}
