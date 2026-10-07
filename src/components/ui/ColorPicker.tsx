import { useState, useRef, useEffect } from "react";
import { useTheme, ACCENT_PRESETS } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

export function ColorPicker() {
  const { accentColor, setAccentColor } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        title="Change accent color"
        aria-label="Change accent color"
        aria-expanded={open}
      >
        <Palette className="h-5 w-5" aria-hidden="true" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-card p-4 shadow-medium">
          <p className="text-sm font-medium text-foreground mb-3">Accent Color</p>

          <div className="grid grid-cols-5 gap-2 mb-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setAccentColor(preset.value)}
                aria-label={`Use ${preset.name} accent color`}
                aria-pressed={accentColor === preset.value}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  accentColor === preset.value
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-border"
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              />
            ))}
          </div>

          <div className="mb-2 flex items-center gap-2">
            <label htmlFor="accent-custom" className="text-xs text-muted-foreground">Custom:</label>
            <input
              id="accent-custom"
              type="color"
              value={accentColor || "#c8952e"}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
            />
            {accentColor && (
              <button
                type="button"
                onClick={() => setAccentColor("")}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
