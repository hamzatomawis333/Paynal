import { useNavigate } from "react-router-dom";
import {
  Bell,
  MessageCircle,
  Package,
  Wallet,
  CreditCard,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/lib/notifications-api";

const typeIcon: Record<NotificationType, LucideIcon> = {
  message: MessageCircle,
  order: Package,
  payment: Wallet,
  subscription: CreditCard,
};

const typeLabel: Record<NotificationType, string> = {
  message: "Message",
  order: "New order",
  payment: "Payment",
  subscription: "Subscription",
};

/**
 * Bell + unread badge shared by the public Navbar and every dashboard header.
 *
 * Polls through useNotifications; clicking an item marks just that row read
 * and follows its link, "Mark all read" clears the badge in one shot.
 */
export function NotificationBell({ enabled = true }: { enabled?: boolean }) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications(enabled);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  const handleOpen = (item: AppNotification) => {
    if (item.is_read === 0) markRead.mutate(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread > 0
              ? `Notifications, ${unread} unread`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
              aria-hidden="true"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <DropdownMenuLabel className="p-0 font-display text-sm">
            Notifications
          </DropdownMenuLabel>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading…" : "You're all caught up"}
            </p>
          ) : (
            notifications.map((item) => {
              const Icon = typeIcon[item.type] ?? Bell;
              const unreadRow = item.is_read === 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpen(item)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    unreadRow && "bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      unreadRow ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>
                    {item.body && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {typeLabel[item.type]}
                    </span>
                  </span>
                  {unreadRow && (
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
