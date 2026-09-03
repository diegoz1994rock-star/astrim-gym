import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { startLanServerBridge } from "@/lib/lan/lanServerBridge";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { ClientProfilePage } from "@/features/clients/ClientProfilePage";
import { TrainersPage } from "@/features/trainers/TrainersPage";
import { TrainerProfilePage } from "@/features/trainers/TrainerProfilePage";
import { MembershipsPage } from "@/features/memberships/MembershipsPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
import { RoutinesPage } from "@/features/routines/RoutinesPage";
import { RoutineDetailPage } from "@/features/routines/RoutineDetailPage";
import { ExercisesPage } from "@/features/exercises/ExercisesPage";
import { AttendancePage } from "@/features/attendance/AttendancePage";
import { KioskPage } from "@/features/kiosk/KioskPage";
import { ProgressPage } from "@/features/progress/ProgressPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AppShell } from "@/app/layout/AppShell";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/kiosko" element={<KioskPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell title="Dashboard">
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <AppShell title="Clientes">
              <ClientsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/:clientId"
        element={
          <ProtectedRoute>
            <AppShell title="Clientes">
              <ClientProfilePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/entrenadores"
        element={
          <ProtectedRoute>
            <AppShell title="Entrenadores">
              <TrainersPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/entrenadores/:trainerId"
        element={
          <ProtectedRoute>
            <AppShell title="Entrenadores">
              <TrainerProfilePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/membresias"
        element={
          <ProtectedRoute>
            <AppShell title="Membresías">
              <MembershipsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagos"
        element={
          <ProtectedRoute>
            <AppShell title="Pagos">
              <PaymentsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rutinas"
        element={
          <ProtectedRoute>
            <AppShell title="Rutinas">
              <RoutinesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rutinas/:routineId"
        element={
          <ProtectedRoute>
            <AppShell title="Rutinas">
              <RoutineDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ejercicios"
        element={
          <ProtectedRoute>
            <AppShell title="Ejercicios">
              <ExercisesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/asistencia"
        element={
          <ProtectedRoute>
            <AppShell title="Asistencia">
              <AttendancePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/progreso"
        element={
          <ProtectedRoute>
            <AppShell title="Progreso">
              <ProgressPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <AppShell title="Configuración">
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // Se monta una única vez para toda la vida de la app (no dentro de
  // AppShell, que se remonta en cada navegación de ruta). La guarda
  // `cancelled` evita que un StrictMode double-mount deje dos listeners
  // activos: si el cleanup llega antes de que resuelva la promesa de
  // listen(), el listener igual se cierra apenas queda registrado.
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    startLanServerBridge().then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
