import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getStoredUser, type ApiUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { NotificationBell } from "@/components/NotificationBell";
import { ChevronLeft, LogOut, Menu, X, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  children: ReactNode;
  /** Sidebar navigation. Order = display order. Never removed, only styled. */
  items: NavItem[];
  /** Where the logo links (and the "back" destination is always "/"). */
  homePath: string;
  /** Fallback header label when no nav item matches the current route. */
  title: string;
  /** Expanded logo: tile + wordmark. */
  logo: ReactNode;
  /** Collapsed logo: just the tile (defaults to full logo if omitted). */
  logoCompact?: ReactNode;
  /** Makes the sidebar user block link to the account/profile page. */
  profileHref?: string;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function roleLabel(role: string | undefined) {
  if (role === "admin") return "Administrator";
  if (role === "seller") return "Seller";
  if (role === "buyer") return "Buyer";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
}

/**
 * Shared shell for the Admin / Buyer / Seller dashboards: collapsible sidebar,
 * mobile drawer, theme controls, and a user block driven by the real
 * authenticated account (AuthContext, with localStorage as an immediate
 * fallback while the session resolves).
 */
export function DashboardLayout({
  children,
  items,
  homePath,
  title,
  logo,
  logoCompact,
  profileHref,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { user: authUser, logout } = useAuth();
  const user: ApiUser | null = authUser ?? getStoredUser();

  // Longest match wins so nested routes highlight the right item
  // (/account/orders/123/pay -> "My Orders", not "Overview").
  const activeHref = items
    .filter((item) =>
      item.href === "/"
        ? location.pathname === "/"
        : location.pathname === item.href ||
          location.pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const headerLabel = items.find((i) => i.href === activeHref)?.label ?? title;

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="flex h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Dashboard navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 lg:relative",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link
            to={homePath}
            onClick={() => setMobileOpen(false)}
            aria-label={title}
            className={cn("flex items-center overflow-hidden", collapsed && "mx-auto")}
          >
            {collapsed ? logoCompact ?? logo : logo}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? link.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{link.label}</span>}
                {collapsed && <span className="sr-only">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          {user &&
            (() => {
              const inner = (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initialsOf(user.full_name || "?")
                    )}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {user.full_name}
                      </span>
                      <span className="block truncate text-xs capitalize text-muted-foreground">
                        {roleLabel(user.role)}
                      </span>
                    </span>
                  )}
                  <span className="sr-only">{user.full_name}</span>
                </>
              );
              const blockClass = cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                profileHref && "hover:bg-muted",
                collapsed && "justify-center px-0"
              );
              return profileHref ? (
                <Link
                  to={profileHref}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? `${user.full_name} — ${roleLabel(user.role)}` : undefined}
                  className={blockClass}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  title={collapsed ? `${user.full_name} — ${roleLabel(user.role)}` : undefined}
                  className={blockClass}
                >
                  {inner}
                </div>
              );
            })()}
          <Link
            to="/"
            title={collapsed ? "Back to Shop" : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Back to Shop</span>}
            {collapsed && <span className="sr-only">Back to Shop</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Logout</span>}
            {collapsed && <span className="sr-only">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <Menu className="h-5 w-5" aria-hidden="true" />
            ) : (
              <X className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
          <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            {headerLabel}
          </p>
          <div className="flex-1" />
          <NotificationBell enabled={!!user} />
          <ThemeToggle />
          <ColorPicker />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
