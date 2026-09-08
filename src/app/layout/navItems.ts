import {
  Apple,
  CalendarCheck,
  CalendarRange,
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

export interface NavGroup {
  /** `null` = sin encabezado (primer bloque). */
  title: string | null;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: null,
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/", enabled: true }],
  },
  {
    title: "Gestión",
    items: [
      { label: "Clientes", icon: Users, path: "/clientes", enabled: true },
      { label: "Entrenadores", icon: UserCog, path: "/entrenadores", enabled: true },
      { label: "Membresías", icon: CreditCard, path: "/membresias", enabled: true },
      { label: "Pagos", icon: Wallet, path: "/pagos", enabled: true },
    ],
  },
  {
    title: "Entrenamiento",
    items: [
      { label: "Rutinas", icon: ListChecks, path: "/rutinas", enabled: true },
      { label: "Plan de Alimentación", icon: Apple, path: "/alimentacion", enabled: true },
      { label: "Ejercicios", icon: Dumbbell, path: "/ejercicios", enabled: true },
      { label: "Clases y Sesiones", icon: CalendarRange, path: "/clases", enabled: true },
      { label: "Asistencia", icon: CalendarCheck, path: "/asistencia", enabled: true },
      { label: "Progreso", icon: TrendingUp, path: "/progreso", enabled: true },
    ],
  },
  {
    title: "Sistema",
    items: [{ label: "Configuración", icon: Settings, path: "/configuracion", enabled: true }],
  },
];

/** Lista plana — se conserva por compatibilidad con cualquier consumidor existente. */
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);
