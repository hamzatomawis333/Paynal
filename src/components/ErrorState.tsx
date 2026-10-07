import type { ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra call-to-action shown under the retry button (or alone if no retry). */
  action?: ReactNode;
  /** Compact variant for error states inside a card body. */
  dense?: boolean;
  className?: string;
}

/**
 * Friendly query-failure state. The raw technical error stays in the console
 * (callers log it); this only shows something a person can act on.
 */
export function ErrorState({
  title = "We couldn't load this",
  description = "Something went wrong while fetching this section. Please check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  action,
  dense,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        dense ? "py-8" : "py-12",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className={dense ? "mt-4" : "mt-5"} onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
