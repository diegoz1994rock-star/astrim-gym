import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as authService from "../services/authService";
import type { AuthUser } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Actualiza solo el nombre del gimnasio en memoria (ej. tras guardar Configuración), sin tocar el resto de la sesión. */
  refreshGymName: (gymName: string) => void;
  /** Igual que refreshGymName pero para el logo, para que el sidebar refleje el cambio sin recargar la sesión. */
  refreshGymLogo: (logoPath: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authService.login(email, password);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const refreshGymName = useCallback((gymName: string) => {
    setUser((prev) => (prev ? { ...prev, gymName } : prev));
  }, []);

  const refreshGymLogo = useCallback((logoPath: string | null) => {
    setUser((prev) => (prev ? { ...prev, gymLogoPath: logoPath } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout, refreshGymName, refreshGymLogo }),
    [user, login, logout, refreshGymName, refreshGymLogo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
