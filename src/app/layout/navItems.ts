import {
  CalendarCheck,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  enabled: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", enabled: true },
  { label: "Clientes", icon: Users, path: "/clientes", enabled: true },
  { label: "Entrenadores", icon: UserCog, path: "/entrenadores", enabled: true },
  { label: "Membresías", icon: CreditCard, path: "/membresias", enabled: true },
  { label: "Pagos", icon: Wallet, path: "/pagos", enabled: true },
  { label: "Rutinas", icon: ListChecks, path: "/rutinas", enabled: true },
  { label: "Ejercicios", icon: Dumbbell, path: "/ejercicios", enabled: true },
  { label: "Asistencia", icon: CalendarCheck, path: "/asistencia", enabled: true },
  { label: "Progreso", icon: TrendingUp, path: "/progreso", enabled: true },
  { label: "Configuración", icon: Settings, path: "/configuracion", enabled: true },
];
