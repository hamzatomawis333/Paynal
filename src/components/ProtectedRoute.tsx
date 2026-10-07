import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children?: ReactNode;
  /** Role allowed to view these routes. Omit to require only a login. */
  role?: "admin" | "seller" | "buyer";
}

/**
 * Client-side route guard.
 *
 * This is a usability layer only: it stops a signed-out or wrong-role visitor
 * from seeing dashboard screens and firing authenticated requests. The real
 * enforcement is server-side, where every endpoint re-checks the token and the
 * role against the database.
 */
export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, role: currentRole } = useAuth();
  const location = useLocation();

  // Wait for the server round-trip before deciding, otherwise a refresh on a
  // protected page would bounce the user to the login screen.
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (role && currentRole !== role) {
    // Signed in, but not for this area. Send them somewhere they can use.
    const home =
      currentRole === "admin" ? "/admin" : currentRole === "seller" ? "/seller" : "/account";
    return <Navigate to={home} replace />;
  }

  // Used as a layout route: render the matched child route.
  return <>{children ?? <Outlet />}</>;
}