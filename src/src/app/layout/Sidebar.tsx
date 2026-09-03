import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import { resolveGymDisplayName } from "@/lib/domain/gymIdentity";
import { Avatar } from "@/components/Avatar";
import { navItems } from "./navItems";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * En pantallas grandes (lg+) es un panel fijo normal. Debajo de ese punto
 * se convierte en un drawer que se desliza sobre el contenido: `open` solo
 * importa ahí (en desktop el CSS lo fuerza siempre visible sin importar el
 * estado, por eso los NavLink pueden llamar onClose sin efecto visible).
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const gymName = resolveGymDisplayName(user?.gymName);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out",
          "lg:static lg:z-auto lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 px-6">
          <Avatar name={gymName} photoPath={user?.gymLogoPath} className="h-9 w-9 shrink-0 text-sm" />
          <span
            className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-sidebar-foreground"
            title={gymName}
          >
            {gymName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            title="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (!item.enabled) {
              return (
                <div
                  key={item.path}
                  className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-muted-foreground/60"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    Pronto
                  </span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-muted",
                    isActive && "bg-primary/15 text-primary hover:bg-primary/15",
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
          v0.1.0 · Fase 1
        </div>
      </aside>
    </>
  );
}
