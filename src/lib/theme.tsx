import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type AccentName = "gold" | "purple" | "blue" | "green";

export const ACCENTS: { value: AccentName; label: string; light: string; dark: string }[] = [
  { value: "gold", label: "Dourado", light: "#94702e", dark: "#d8b26c" },
  { value: "purple", label: "Roxo", light: "#6b4fc0", dark: "#b6a0f2" },
  { value: "blue", label: "Azul", light: "#2c62c2", dark: "#8fb6f4" },
  { value: "green", label: "Verde", light: "#2c7a52", dark: "#82cda2" },
];

const MODE_KEY = "eletrodash-theme";
const ACCENT_KEY = "eletrodash-accent";

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: só não lembra a escolha */
  }
}

const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;

/** Aplica tema e cor no <html>. Chamado também antes do React, para não piscar. */
export function applyTheme(mode: ThemeMode, accent: AccentName) {
  const dark = mode === "dark" || (mode === "system" && systemDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  if (accent === "gold") root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", accent);
}

export function initialTheme() {
  return {
    mode: read<ThemeMode>(MODE_KEY, ["light", "dark", "system"], "dark"),
    accent: read<AccentName>(ACCENT_KEY, ["gold", "purple", "blue", "green"], "gold"),
  };
}

interface ThemeState {
  mode: ThemeMode;
  accent: AccentName;
  dark: boolean;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentName) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => initialTheme().mode);
  const [accent, setAccent] = useState<AccentName>(() => initialTheme().accent);
  const [sys, setSys] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = () => setSys(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    applyTheme(mode, accent);
    write(MODE_KEY, mode);
    write(ACCENT_KEY, accent);
  }, [mode, accent, sys]);

  const dark = mode === "dark" || (mode === "system" && sys);
  return (
    <Ctx.Provider
      value={{
        mode,
        accent,
        dark,
        setMode,
        setAccent,
        toggle: () => setMode(dark ? "light" : "dark"),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme precisa do ThemeProvider");
  return v;
}
