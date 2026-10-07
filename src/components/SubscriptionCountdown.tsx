import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// MySQL DATE values arrive as "YYYY-MM-DD". `new Date("YYYY-MM-DD")` parses as
// UTC midnight, but the server auto-expires subscriptions at LOCAL midnight of
// end_date (strtotime("YYYY-MM-DD")), so append a local time to match it.
function parseEndDate(endDate: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ? new Date(`${endDate}T00:00:00`)
    : new Date(endDate);
}

interface SubscriptionCountdownProps {
  endDate: string | null | undefined;
  className?: string;
  showSeconds?: boolean;
  expiredText?: string;
}

export function SubscriptionCountdown({
  endDate,
  className,
  showSeconds = true,
  expiredText = "Expired",
}: SubscriptionCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endDate) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [endDate]);

  if (!endDate) return null;

  const diff = parseEndDate(endDate).getTime() - now;
  if (diff <= 0) {
    return <span className={cn("font-medium text-destructive", className)}>{expiredText}</span>;
  }

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className={cn("tabular-nums font-medium", className)}>
      {days > 0 && `${days}d `}
      {pad(hours)}h {pad(minutes)}m
      {showSeconds && ` ${pad(seconds)}s`}
    </span>
  );
}
