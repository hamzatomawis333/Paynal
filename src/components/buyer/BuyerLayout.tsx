import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  History,
  User,
  CreditCard,
  MessageCircle,
} from "lucide-react";

const sidebarLinks: NavItem[] = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/account/messages", label: "Messages", icon: MessageCircle },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/history", label: "Order History", icon: History },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/payments", label: "Payments", icon: CreditCard },
];

const logoTile = (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-gold">
    <span className="font-display text-sm font-bold text-primary-foreground">L</span>
  </span>
);

const logo = (
  <>
    {logoTile}
    <span className="font-display text-lg font-semibold text-foreground">
      My<span className="text-primary">Account</span>
    </span>
  </>
);

export function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      items={sidebarLinks}
      homePath="/account"
      title="My Account"
      logo={logo}
      logoCompact={logoTile}
      profileHref="/account/profile"
    >
      {children}
    </DashboardLayout>
  );
}
