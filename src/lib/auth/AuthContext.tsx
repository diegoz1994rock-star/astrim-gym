import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  /** Motivo por el que se cerró la sesión sola (p. ej. licencia vencida); lo muestra el login. */
  sessionEndedReason: string | null;
}

/** Cada cuánto se revisa la licencia con la sesión abierta. */
const LICENSE_CHECK_MS = 30 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionEndedReason, setSessionEndedReason] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authService.login(email, password);
    setSessionEndedReason(null);
    setUser(authUser);
  }, []);

  // Si la licencia vence (o la suspenden desde la consola) con el panel
  // abierto, se cierra la sesión y el login muestra el motivo.
  const gymId = user?.gymId ?? null;
  useEffect(() => {
    if (!gymId) return;
    let cancelled = false;
    const check = async () => {
      try {
        const reason = await authService.checkGymLicense(gymId);
        if (reason && !cancelled) {
          setSessionEndedReason(reason);
          setUser(null);
        }
      } catch {
        /* sin base/red: se reintenta en la próxima vuelta */
      }
    };
    const timer = window.setInterval(check, LICENSE_CHECK_MS);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [gymId]);

  const logout = useCallback(() => setUser(null), []);

  const refreshGymName = useCallback((gymName: string) => {
    setUser((prev) => (prev ? { ...prev, gymName } : prev));
  }, []);

  const refreshGymLogo = useCallback((logoPath: string | null) => {
    setUser((prev) => (prev ? { ...prev, gymLogoPath: logoPath } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
      refreshGymName,
      refreshGymLogo,
      sessionEndedReason,
    }),
    [user, login, logout, refreshGymName, refreshGymLogo, sessionEndedReason],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
