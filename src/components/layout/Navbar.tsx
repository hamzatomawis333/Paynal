import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useCart } from "@/context/CartContext";
import {
  ShoppingCart, Menu, X, User, Search, Store, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredUser, isLoggedIn, logoutUser } from "@/lib/api";

const navLinks = [
  { href: "/", label: "Home", exact: true },
  { href: "/products", label: "Shop" },
  { href: "/artisans", label: "Artisans" },
  { href: "/about", label: "About" },
];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const loggedIn = isLoggedIn();
  const user = getStoredUser();
  const isSeller = user?.role === "seller";
  const isAdmin = user?.role === "admin";

  const roleHome = isAdmin ? "/admin" : isSeller ? "/seller" : "/account";
  const roleLabel = isAdmin
    ? "Administrator"
    : isSeller
      ? "Seller"
      : "Buyer";
  const roleIcon = isAdmin ? Shield : isSeller ? Store : User;
  const RoleIcon = roleIcon;

  const handleLogout = () => {
    logoutUser();
    navigate("/");
    window.location.reload();
  };

  const isLinkActive = (href: string, exact?: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
    setIsOpen(false);
    setSearchOpen(false);
  };

  const accountChip = user && (
    <Link
      to={roleHome}
      title={`${user.full_name} — ${roleLabel}`}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-bold text-primary">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsOf(user.full_name || "?")
        )}
      </span>
      <span className="hidden min-w-0 text-left md:block">
        <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight text-foreground">
          {user.full_name}
        </span>
        <span className="block text-[11px] leading-tight text-muted-foreground">
          {roleLabel}
        </span>
      </span>
      <span className="sr-only">
        {roleLabel} account — go to dashboard
      </span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <nav className="container mx-auto px-4" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between gap-2 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold">
              <span className="font-display text-lg font-bold text-primary-foreground">L</span>
            </span>
            <span className="hidden sm:block">
              <span className="block font-display text-xl font-semibold text-foreground">
                Lanao<span className="text-primary">Crafts</span>
              </span>
              <span className="block text-[10px] text-muted-foreground">Cultural Treasures</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={isLinkActive(link.href, link.exact) ? "page" : undefined}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isLinkActive(link.href, link.exact)
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <ColorPicker />

            {/* Search: expands into an input, submits to the shop */}
            <form onSubmit={submitSearch} className="hidden items-center sm:flex">
              {searchOpen && (
                <Input
                  autoFocus
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onBlur={() => {
                    if (!term.trim()) setSearchOpen(false);
                  }}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="mr-1 h-9 w-36 lg:w-52"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={searchOpen ? "Submit search" : "Search products"}
                onClick={
                  searchOpen
                    ? undefined
                    : () => {
                        setSearchOpen(true);
                        setTerm(
                          location.pathname === "/products"
                            ? new URLSearchParams(location.search).get("q") ?? ""
                            : ""
                        );
                      }
                }
                type={searchOpen ? "submit" : "button"}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </Button>
            </form>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative" aria-label={`Cart, ${totalItems} item(s)`}>
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {loggedIn ? (
              <div className="hidden items-center gap-1 sm:flex">
                {accountChip}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Link to="/auth" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <User className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              {isOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div id="mobile-menu" className="border-t border-border py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              <form onSubmit={submitSearch} className="flex items-center gap-2 px-2 py-1">
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="h-9 flex-1"
                />
                <Button type="submit" variant="outline" size="sm" aria-label="Submit search">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
              <div className="flex items-center gap-2 px-4 py-2">
                <ThemeToggle />
                <ColorPicker />
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isLinkActive(link.href, link.exact) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    isLinkActive(link.href, link.exact)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {loggedIn ? (
                <>
                  <div className="border-t border-border px-2 pt-2">{accountChip}</div>
                  <Link to={roleHome} onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <RoleIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isAdmin ? "Admin Panel" : isSeller ? "Seller Hub" : "My Account"}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="mt-2 w-full"
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="mt-2 w-full">
                    <User className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
