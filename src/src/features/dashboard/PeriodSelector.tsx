import type { DashboardPeriod, DashboardPeriodKind } from "@/lib/domain/dashboardPeriod";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const KIND_LABELS: Record<DashboardPeriodKind, string> = {
  YEAR: "Año completo",
  LAST_6_MONTHS: "Últimos 6 meses",
  LAST_3_MONTHS: "Últimos 3 meses",
  MONTH: "Mes actual",
  CUSTOM: "Periodo personalizado",
  TODAY: "Hoy",
  WEEK: "Esta semana",
  LAST_YEAR: "Año anterior",
};

const SELECTABLE_KINDS: DashboardPeriodKind[] = [
  "YEAR",
  "LAST_6_MONTHS",
  "LAST_3_MONTHS",
  "MONTH",
  "CUSTOM",
];

interface PeriodSelectorProps {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  availableYears: number[];
}

/** Selector combinado de año + periodo pedido explícitamente para la
 * gráfica anual, reutilizado también por los widgets de planes/ranking que
 * comparten el mismo periodo (evita construir dos selectores separados). */
export function PeriodSelector({ period, onChange, availableYears }: PeriodSelectorProps) {
  const years = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {period.kind === "YEAR" && (
        <Select
          className="w-auto"
          value={period.year ?? years[0]}
          onChange={(e) => onChange({ kind: "YEAR", year: Number(e.target.value) })}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      )}
      <Select
        className="w-auto"
        value={period.kind}
        onChange={(e) => {
          const kind = e.target.value as DashboardPeriodKind;
          if (kind === "YEAR") onChange({ kind: "YEAR", year: years[0] });
          else if (kind === "CUSTOM") {
            const today = new Date().toISOString().slice(0, 10);
            onChange({ kind: "CUSTOM", customRange: { start: today, end: today } });
          } else onChange({ kind });
        }}
      >
        {SELECTABLE_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {KIND_LABELS[kind]}
          </option>
        ))}
      </Select>
      {period.kind === "CUSTOM" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-11 w-auto"
            value={period.customRange?.start ?? ""}
            onChange={(e) =>
              onChange({
                kind: "CUSTOM",
                customRange: { start: e.target.value, end: period.customRange?.end ?? e.target.value },
              })
            }
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            className="h-11 w-auto"
            value={period.customRange?.end ?? ""}
            onChange={(e) =>
              onChange({
                kind: "CUSTOM",
                customRange: { start: period.customRange?.start ?? e.target.value, end: e.target.value },
              })
            }
          />
        </div>
      )}
    </div>
  );
}
