// Theme mode: light / dark / system. Persisted; applied as data-theme on <html>.
export type ThemeMode = "light" | "dark" | "system";

const KEY = "zap-theme";

export function getThemeMode(): ThemeMode {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function setThemeMode(mode: ThemeMode) {
  if (mode === "system") localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, mode);
  applyTheme();
}

export function applyTheme() {
  const mode = getThemeMode();
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  // Keep the iOS status bar / PWA chrome color in sync.
  const dark =
    mode === "dark" ||
    (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#222327" : "#fafafb");
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
