import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme/ThemeProvider";

/**
 * Control segmentado ☀️ / 🌙. El fondo del "pill" se desliza al lado
 * activo con una transición corta. Forma parte natural de la barra
 * superior, no es un botón suelto que diga "Dark Mode".
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className={cn(
        "relative inline-flex items-center rounded-full border border-border bg-surface-muted p-0.5",
        className,
      )}
    >
      {/* indicador deslizante */}
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 h-7 w-7 rounded-full bg-surface shadow-xs transition-transform duration-200 ease-out",
          theme === "dark" ? "translate-x-7" : "translate-x-0",
        )}
      />
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        title="Tema claro"
        className={cn(
          "relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          theme === "light" ? "text-primary" : "text-subtle hover:text-muted-foreground",
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        title="Tema oscuro"
        className={cn(
          "relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          theme === "dark" ? "text-primary" : "text-subtle hover:text-muted-foreground",
        )}
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
