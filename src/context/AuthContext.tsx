import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchCurrentUser, logoutUser, type ApiUser } from "@/lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  role: null,
  refresh: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    // No token means logged out. Do not trust localStorage for identity.
    if (!localStorage.getItem("auth_token")) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Ask the server who this token belongs to. The role comes from the
      // database, so a tampered localStorage cannot escalate privileges.
      const data = await fetchCurrentUser();
      setUser(data.user);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
    } catch {
      // Expired, revoked or deactivated token.
      logoutUser();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role: user?.role ?? null,
        refresh: load,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}