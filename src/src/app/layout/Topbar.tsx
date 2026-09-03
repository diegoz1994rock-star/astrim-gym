import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super administrador",
  ADMIN: "Administrador",
  TRAINER: "Entrenador",
  CLIENT: "Cliente",
};

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 shrink-0 rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          title="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {user?.gymName && <p className="truncate text-xs text-muted-foreground">{user.gymName}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user ? ROLE_LABELS[user.role] : ""}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} title="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
