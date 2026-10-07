import { useRef, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatGcashReference,
  normaliseGcashReference,
  validateGcashReference,
} from "@/lib/payments-api";

interface Props {
  id: string;
  value: string;
  onChange: (raw: string) => void;
  touched: boolean;
  onBlur: () => void;
  disabled?: boolean;
}

/**
 * Reference entry for the GCash "I've sent it" step.
 *
 * Built for pasting rather than typing: GCash references are long digit strings
 * that nobody wants to key in by hand on a phone. The field keeps the raw value
 * for correctness but regroups it 4-3-4 as you type or paste, and offers an
 * explicit clipboard button because browsers often block clipboard reads from a
 * page that has not been focused.
 */
export default function GcashReferenceInput({
  id, value, onChange, touched, onBlur, disabled,
}: Props) {
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = validateGcashReference(value);
  const showError = touched && error !== null;

  const handleChange = (next: string) => {
    setPasteError(null);
    // Strip separators as they are typed so the grouped view and the stored value
    // cannot drift apart.
    onChange(normaliseGcashReference(next));
  };

  const handlePaste = async () => {
    setPasting(true);
    setPasteError(null);
    try {
      const text = await navigator.clipboard.readText();
      const normalised = normaliseGcashReference(text);
      if (normalised === "") {
        setPasteError("Nothing to paste - copy the reference from your GCash receipt");
        return;
      }
      onChange(normalised);
      inputRef.current?.focus();
    } catch {
      setPasteError("Could not read the clipboard - paste into the box instead");
    } finally {
      setPasting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium">
          GCash reference number
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={disabled || pasting}
          onClick={() => void handlePaste()}
        >
          <ClipboardPaste className="h-3 w-3" />
          {pasting ? "Pasting..." : "Paste"}
        </Button>
      </div>

      <Input
        id={id}
        ref={inputRef}
        value={formatGcashReference(value)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="0000 000 0000"
        aria-invalid={showError}
        aria-describedby={`${id}-help`}
        className={`font-mono tracking-wider ${showError ? "border-destructive" : ""}`}
      />

      <p
        id={`${id}-help`}
        className={`text-xs ${showError ? "text-destructive" : "text-muted-foreground"}`}
      >
        {showError
          ? error
          : pasteError
            ? pasteError
            : "Copy this from your GCash receipt or confirmation message, then paste it here."}
      </p>
    </div>
  );
}