import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CardioEquipmentProfile, ExerciseConfigurationMode } from "@/lib/domain/exerciseConfigMode";
import {
  INTENSITY_LABEL_OPTIONS,
  type ExerciseConfigInput,
  type ExerciseConfigErrors,
  type TimeUnit,
} from "@/types/exerciseConfig";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

interface ExerciseConfigFieldsProps {
  value: ExerciseConfigInput;
  mode: ExerciseConfigurationMode;
  cardioProfile: CardioEquipmentProfile;
  errors?: ExerciseConfigErrors;
  onChange: (patch: Partial<ExerciseConfigInput>) => void;
  /** Muestra el textarea de Observaciones (Rutinas lo usa; algunos usos inline no). */
  showNotes?: boolean;
  /** Etiquetas más compactas para el uso embebido dentro de Clases. */
  dense?: boolean;
}

/**
 * Campos de configuración de un ejercicio, adaptados a su tipo. Fuente única
 * compartida por Rutinas y por Clases/Sesiones, para que un ejercicio de
 * cardio pida tiempo/resistencia en ambos lados y no series/reps.
 */
export function ExerciseConfigFields({
  value,
  mode,
  cardioProfile,
  errors = {},
  onChange,
  showNotes = true,
  dense = false,
}: ExerciseConfigFieldsProps) {
  const labelCls = dense
    ? "mb-1 block text-xs font-medium text-muted-foreground"
    : "mb-1.5 block text-sm font-medium text-foreground";

  function num(raw: string): number | null {
    return raw === "" ? null : Number(raw);
  }

  function handleTimeValueChange(raw: string) {
    const v = num(raw);
    onChange({ timeValue: v, timeUnit: value.timeUnit ?? (v !== null ? "MINUTES" : null) });
  }

  return (
    <>
      {mode === "STRENGTH" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Series</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={value.sets ?? ""}
              onChange={(e) => onChange({ sets: num(e.target.value) })}
            />
            <FieldError message={errors.sets} />
          </div>
          <div>
            <label className={labelCls}>Repeticiones</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={value.reps ?? ""}
              onChange={(e) => onChange({ reps: num(e.target.value) })}
            />
            <FieldError message={errors.reps} />
          </div>
          <div>
            <label className={labelCls}>Peso (kg)</label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={value.weight ?? ""}
              onChange={(e) => onChange({ weight: num(e.target.value) })}
            />
            <FieldError message={errors.weight} />
          </div>
          <div>
            <label className={labelCls}>Descanso (segundos)</label>
            <Input
              type="number"
              min={0}
              step={5}
              value={value.restSeconds ?? ""}
              onChange={(e) => onChange({ restSeconds: num(e.target.value) })}
            />
            <FieldError message={errors.restSeconds} />
          </div>
        </div>
      )}

      {(mode === "CARDIO_TIME" || mode === "MOBILITY") && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>Tiempo *</label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                type="number"
                min={0}
                step="any"
                placeholder="Ej. 30"
                value={value.timeValue ?? ""}
                onChange={(e) => handleTimeValueChange(e.target.value)}
              />
              <Select
                className="w-32 shrink-0"
                value={value.timeUnit ?? "MINUTES"}
                onChange={(e) => onChange({ timeUnit: e.target.value as TimeUnit })}
              >
                <option value="MINUTES">Minutos</option>
                <option value="HOURS">Horas</option>
              </Select>
            </div>
            <FieldError message={errors.timeValue} />
          </div>

          {mode === "CARDIO_TIME" && cardioProfile === "TREADMILL" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Velocidad (km/h) *</label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={value.speedKmh ?? ""}
                  onChange={(e) => onChange({ speedKmh: num(e.target.value) })}
                />
                <FieldError message={errors.speedKmh} />
              </div>
              <div>
                <label className={labelCls}>Inclinación (%)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={value.inclinePercent ?? ""}
                  onChange={(e) => onChange({ inclinePercent: num(e.target.value) })}
                />
                <FieldError message={errors.inclinePercent} />
              </div>
            </div>
          )}

          {mode === "CARDIO_TIME" &&
            (cardioProfile === "BIKE" || cardioProfile === "ROWER" || cardioProfile === "CLIMBER") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    {cardioProfile === "CLIMBER" ? "Nivel *" : "Resistencia (nivel) *"}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={value.resistanceLevel ?? ""}
                    onChange={(e) => onChange({ resistanceLevel: num(e.target.value) })}
                  />
                  <FieldError message={errors.resistanceLevel} />
                </div>
                {cardioProfile === "BIKE" && (
                  <div>
                    <label className={labelCls}>RPM (opcional)</label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={value.rpm ?? ""}
                      onChange={(e) => onChange({ rpm: num(e.target.value) })}
                    />
                    <FieldError message={errors.rpm} />
                  </div>
                )}
              </div>
            )}

          {mode === "CARDIO_TIME" && cardioProfile === "GENERIC" && (
            <div>
              <label className={labelCls}>Intensidad *</label>
              <Select
                value={value.intensityLabel ?? ""}
                onChange={(e) => onChange({ intensityLabel: e.target.value || null })}
              >
                <option value="">Selecciona la intensidad</option>
                {INTENSITY_LABEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.intensityLabel} />
            </div>
          )}
        </div>
      )}

      {showNotes && (
        <div>
          <label className={labelCls}>Observaciones</label>
          <Textarea rows={2} value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} />
        </div>
      )}
    </>
  );
}
