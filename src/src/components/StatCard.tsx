import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatTone = "primary" | "success" | "warning" | "danger";

const TONE_STYLES: Record<StatTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export interface StatTrend {
  /** Porcentaje ya calculado (ej. 12.67). `null` = sin periodo anterior disponible. */
  value: number | null;
  /** Ej. "vs. mes anterior". */
  label?: string;
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
  delay?: number;
  /** Si se indica, la tarjeta se vuelve clickeable (ej. ir al listado filtrado correspondiente). */
  onClick?: () => void;
  /** Comparación con el periodo anterior. Nunca se inventa: si `value` es null se muestra "Sin comparación disponible". */
  trend?: StatTrend;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  delay = 0,
  onClick,
  trend,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card
        className={cn(
          "transition-shadow hover:shadow-md",
          onClick && "cursor-pointer hover:ring-2 hover:ring-primary/30",
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <CardContent className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
            {trend && (
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trend.value === null
                    ? "text-muted-foreground"
                    : trend.value >= 0
                      ? "text-success"
                      : "text-danger",
                )}
              >
                {trend.value === null ? (
                  "Sin comparación disponible"
                ) : (
                  <>
                    {trend.value >= 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {trend.value >= 0 ? "+" : ""}
                    {trend.value.toFixed(1)}%{trend.label ? ` ${trend.label}` : ""}
                  </>
                )}
              </p>
            )}
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", TONE_STYLES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
