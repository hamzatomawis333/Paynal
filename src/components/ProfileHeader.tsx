import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";

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

interface ProfileHeaderProps {
  name: string;
  email: string;
  role?: string | null;
  createdAt?: string | null;
  avatarUrl?: string | null;
  /** Optional actions rendered on the right of the header. */
  children?: React.ReactNode;
}

/**
 * Shared identity header for the buyer / seller / admin profile pages so all
 * three roles present their account information the same way.
 */
export function ProfileHeader({ name, email, role, createdAt, avatarUrl, children }: ProfileHeaderProps) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary"
            aria-hidden="true"
          >
            {initialsOf(name || "?")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold text-foreground">
            {name || "Your Account"}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{email}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {role && (
              <Badge variant="secondary" className="font-medium capitalize">
                {roleLabel(role)}
              </Badge>
            )}
            {createdAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Member since {formatDate(createdAt, true)}
              </span>
            )}
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </CardContent>
    </Card>
  );
}