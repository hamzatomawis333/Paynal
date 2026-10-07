import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Store,
  FolderTree,
  BarChart3,
  CreditCard,
  Shield,
  UserCheck,
  MessageCircle,
  User,
  History,
} from "lucide-react";

const sidebarLinks: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: UserCheck },
  { href: "/admin/messages", label: "Seller Messages", icon: MessageCircle },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/payment-methods", label: "Payments", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit Log", icon: History },
  { href: "/admin/profile", label: "Profile", icon: User },
];

const logoTile = (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive">
    <Shield className="h-4 w-4 text-destructive-foreground" aria-hidden="true" />
  </span>
);

const logo = (
  <>
    {logoTile}
    <span className="font-display text-lg font-semibold text-foreground">
      Admin<span className="text-primary">Panel</span>
    </span>
  </>
);

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      items={sidebarLinks}
      homePath="/admin"
      title="Admin"
      logo={logo}
      logoCompact={logoTile}
      profileHref="/admin/profile"
    >
      {children}
    </DashboardLayout>
  );
}
