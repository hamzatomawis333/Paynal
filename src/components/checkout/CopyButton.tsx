import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Copies a value to the clipboard, falling back to a prompt rather than failing
 * silently, since clipboard writes can be blocked in insecure contexts.
 */
export default function CopyButton({
  value,
  label = "Copy to clipboard",
}: {
  value: string;
  label?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy - select the number manually");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 px-2"
      onClick={() => void copy()}
      aria-label={label}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}