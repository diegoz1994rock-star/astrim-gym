import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super administrador",
  ADMIN: "Administrador",
  TRAINER: "Entrenador",
  CLIENT: "Cliente",
};

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 shrink-0 rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
          title="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {user?.gymName && (
            <p className="truncate text-xs text-muted-foreground">{user.gymName}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <ThemeToggle />

        <div className="hidden h-8 w-px bg-border sm:block" />

        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight text-foreground">{user?.name}</p>
            <p className="text-xs leading-tight text-muted-foreground">
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>
          <Avatar name={user?.name ?? "?"} className="h-8 w-8 text-xs" />
        </div>

        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
