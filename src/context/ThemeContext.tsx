import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface ThemeContextValue {
  dark: boolean;
  toggleDark: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  toggleDark: () => {},
  accentColor: "",
  setAccentColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Convert hex to HSL string for CSS var
function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Apply accent color to CSS variables
function applyAccentColor(hex: string) {
  if (!hex) {
    // Reset to defaults
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--primary-foreground");
    document.documentElement.style.removeProperty("--ring");
    document.documentElement.style.removeProperty("--gold");
    return;
  }
  const hsl = hexToHsl(hex);
  document.documentElement.style.setProperty("--primary", hsl);
  document.documentElement.style.setProperty("--ring", hsl);
  document.documentElement.style.setProperty("--gold", hsl);

  // Determine if we need light or dark foreground
  const parts = hsl.split(" ");
  const lightness = parseInt(parts[2]);
  const fg = lightness > 55 ? "25 30% 8%" : "0 0% 98%";
  document.documentElement.style.setProperty("--primary-foreground", fg);
}

// Preset accent colors
export const ACCENT_PRESETS = [
  { name: "Gold (Default)", value: "#c8952e" },
  { name: "Teal", value: "#2b8a7e" },
  { name: "Burgundy", value: "#8b2252" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Cyan", value: "#06b6d4" },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("maranao_theme_dark");
    return saved === "true";
  });

  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem("maranao_accent_color") || "";
  });

  // Apply dark mode
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("maranao_theme_dark", String(dark));
  }, [dark]);

  // Apply accent color
  useEffect(() => {
    applyAccentColor(accentColor);
    if (accentColor) {
      localStorage.setItem("maranao_accent_color", accentColor);
    } else {
      localStorage.removeItem("maranao_accent_color");
    }
  }, [accentColor]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
