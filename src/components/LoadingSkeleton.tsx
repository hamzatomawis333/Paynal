import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Table-shaped loading placeholder that matches the real table's density. */
export function TableSkeleton({
  rows = 4,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 p-4", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-1/4" : "flex-1", c === cols - 1 && "max-w-[80px]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Generic block placeholder for cards/panels. */
export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-24 w-full rounded-lg", className)} aria-hidden="true" />;
}
