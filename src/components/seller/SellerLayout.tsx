import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  User,
  MessageCircle,
  CreditCard,
} from "lucide-react";

const sidebarLinks: NavItem[] = [
  { href: "/seller", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/seller/messages", label: "Messages", icon: MessageCircle },
  { href: "/seller/subscription", label: "Subscription", icon: CreditCard },
  { href: "/seller/profile", label: "Profile", icon: User },
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
      Seller<span className="text-primary">Hub</span>
    </span>
  </>
);

export function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      items={sidebarLinks}
      homePath="/seller"
      title="Seller Hub"
      logo={logo}
      logoCompact={logoTile}
      profileHref="/seller/profile"
    >
      {children}
    </DashboardLayout>
  );
}
