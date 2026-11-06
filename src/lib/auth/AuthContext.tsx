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
import { isCloudConfigured } from "../cloud/firebase";
import { currentCloudUser } from "../cloud/cloudAuth";
import {
  isLocalGymEmpty,
  restoreFromCloud,
  restoredCount,
  type RestoreSummary,
} from "../cloud/cloudRestoreService";
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
  /** Mientras se restauran datos de la nube al iniciar sesión: qué se está haciendo. */
  restoreProgress: string | null;
  /** Resultado de la restauración automática (para avisar en el panel). */
  autoRestore: RestoreSummary | null;
  dismissAutoRestore: () => void;
}

/** Cada cuánto se revisa la licencia con la sesión abierta. */
const LICENSE_CHECK_MS = 30 * 60 * 1000;

function emptyRestore(): RestoreSummary {
  return {
    gymProfile: false, trainers: 0, membershipPlans: 0, exercises: 0, exerciseVideos: 0,
    foods: 0, clients: 0, classTypes: 0, routines: 0, routineExercises: 0, classes: 0,
    classBlocks: 0, classBlockExercises: 0, mealPlans: 0, mealPlanItems: 0, mealPlanTargets: 0,
    mealPlanAllowedFoods: 0, memberships: 0, payments: 0, attendance: 0, measurements: 0,
    routineAssignments: 0, mealPlanAssignments: 0, classEnrollments: 0, errors: [],
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionEndedReason, setSessionEndedReason] = useState<string | null>(null);

  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [autoRestore, setAutoRestore] = useState<RestoreSummary | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authService.login(email, password);
    setSessionEndedReason(null);

    // PC nueva / reinstalación: si este equipo no tiene ningún cliente del
    // gimnasio, se trae todo de la nube ANTES de entrar al panel, así el
    // dueño no ve un gimnasio vacío ni tiene que buscar el botón.
    if (
      authUser.role === "ADMIN" &&
      authUser.gymId &&
      isCloudConfigured &&
      currentCloudUser() &&
      (await isLocalGymEmpty(authUser.gymId))
    ) {
      setRestoreProgress("Buscando tus datos en la nube…");
      try {
        const summary = await restoreFromCloud(authUser.gymId, setRestoreProgress);
        if (restoredCount(summary) > 0 || summary.errors.length > 0) setAutoRestore(summary);
      } catch (err) {
        setAutoRestore({
          ...emptyRestore(),
          errors: [err instanceof Error ? err.message : String(err)],
        });
      } finally {
        setRestoreProgress(null);
      }
    }

    setUser(authUser);
  }, []);

  const dismissAutoRestore = useCallback(() => setAutoRestore(null), []);

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
      restoreProgress,
      autoRestore,
      dismissAutoRestore,
    }),
    [
      user,
      login,
      logout,
      refreshGymName,
      refreshGymLogo,
      sessionEndedReason,
      restoreProgress,
      autoRestore,
      dismissAutoRestore,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
