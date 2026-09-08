import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import { resolveGymDisplayName } from "@/lib/domain/gymIdentity";
import { Avatar } from "@/components/Avatar";
import { navGroups } from "./navItems";

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
        <div
          className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out",
          "lg:static lg:z-auto lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Identidad del gimnasio */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <Avatar
            name={gymName}
            photoPath={user?.gymLogoPath}
            className="h-9 w-9 shrink-0 rounded-lg text-[13px]"
          />
          <span
            className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-foreground"
            title={gymName}
          >
            {gymName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
            title="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación agrupada */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navGroups.map((group, groupIndex) => (
            <div key={group.title ?? `group-${groupIndex}`} className="space-y-1">
              {group.title && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;

                if (!item.enabled) {
                  return (
                    <div
                      key={item.path}
                      className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-subtle/70"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-[18px] w-[18px]" />
                        {item.label}
                      </span>
                      <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
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
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-soft text-primary-soft-foreground"
                          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                            isActive ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-subtle group-hover:text-muted-foreground",
                          )}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-1.5 border-t border-sidebar-border px-5 py-4 text-center">
          <img
            src="/astrim-logo.png"
            alt="ASTRIM GYM"
            className="h-auto w-40 object-contain"
          />
          <span className="text-sm text-subtle">versión 2.1.0</span>
        </div>
      </aside>
    </>
  );
}
