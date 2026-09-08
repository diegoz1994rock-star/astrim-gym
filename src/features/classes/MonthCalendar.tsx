import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Lunes = 0 ... domingo = 6, para que la grilla empiece en lunes (convención local). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

interface MonthCalendarProps {
  month: Date;
  selectedDate: string;
  /** Fecha ISO -> cantidad de clases ese día, para el indicador. */
  countsByDate: Map<string, number>;
  onSelectDate: (iso: string) => void;
  onChangeMonth: (delta: number) => void;
}

export function MonthCalendar({ month, selectedDate, countsByDate, onSelectDate, onChangeMonth }: MonthCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth);
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const todayIso = toIso(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - leadingBlanks + 1;
    cells.push(dayNumber >= 1 && dayNumber <= daysInMonth ? new Date(year, monthIndex, dayNumber) : null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {MONTH_LABELS[monthIndex]} {year}
        </p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChangeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChangeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={index} />;
          const iso = toIso(date);
          const count = countsByDate.get(iso) ?? 0;
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "border border-primary text-foreground hover:bg-surface-muted"
                    : "text-foreground hover:bg-surface-muted"
              }`}
            >
              {date.getDate()}
              {count > 0 && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
