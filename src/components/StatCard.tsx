import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type StatTone = "primary" | "success" | "warning" | "danger";

const TONE_STYLES: Record<StatTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        className={cn(
          "p-5 transition-[box-shadow,border-color,transform] duration-150",
          onClick &&
            "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
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
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              TONE_STYLES[tone],
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </div>
        <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-foreground">
          {value}
        </p>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        {trend && (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trend.value === null
                ? "text-subtle"
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
      </Card>
    </motion.div>
  );
}
