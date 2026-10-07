import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned controls (buttons, filters). Wraps on small screens. */
  actions?: ReactNode;
  className?: string;
}

/** The single page-title pattern used by every dashboard page. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
