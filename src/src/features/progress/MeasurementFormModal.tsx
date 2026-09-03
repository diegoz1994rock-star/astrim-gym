import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validateMeasurementForm } from "@/lib/domain/measurementValidation";
import type { MeasurementValidationErrors } from "@/lib/domain/measurementValidation";
import { HEIGHT_CM_LIMITS, cmToMeters, metersToCm } from "@/lib/domain/validation";
import * as measurementService from "@/lib/services/measurementService";
import { MeasurementValidationError } from "@/lib/services/measurementService";
import { emptyMeasurementForm, type MeasurementFormInput } from "@/types/measurement";

interface MeasurementFormModalProps {
  open: boolean;
  gymId: string;
  clientId: string;
  clientName: string;
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function MeasurementFormModal({
  open,
  gymId,
  clientId,
  clientName,
  onClose,
  onSaved,
}: MeasurementFormModalProps) {
  const [form, setForm] = useState<MeasurementFormInput>(() => emptyMeasurementForm(clientId));
  const [errors, setErrors] = useState<MeasurementValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(emptyMeasurementForm(clientId));
      setErrors({});
      setFormError(null);
    }
  }, [open, clientId]);

  function update<K extends keyof MeasurementFormInput>(key: K, value: MeasurementFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function numberField(value: string): number | null {
    return value === "" ? null : Number(value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateMeasurementForm(form);
    if (fieldErrors.height) {
      // El límite real (0.3-2.5 m) no cambia; solo se expresa en cm, que es
      // la unidad que ve y escribe el usuario en este formulario.
      fieldErrors.height = `La altura debe estar entre ${HEIGHT_CM_LIMITS.min} y ${HEIGHT_CM_LIMITS.max} cm.`;
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await measurementService.createMeasurement(gymId, form);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof MeasurementValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo registrar la medición.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar progreso"
      description={clientName}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Fecha de medición *
          </label>
          <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          <FieldError message={errors.date} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Peso (kg)</label>
            <Input
              type="number"
              step="0.1"
              value={form.weight ?? ""}
              onChange={(e) => update("weight", numberField(e.target.value))}
            />
            <FieldError message={errors.weight} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Altura (cm)</label>
            <Input
              type="number"
              step="1"
              value={form.height !== null ? metersToCm(form.height) : ""}
              onChange={(e) => {
                const cm = numberField(e.target.value);
                update("height", cm === null ? null : cmToMeters(cm));
              }}
            />
            <FieldError message={errors.height} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Medidas corporales (cm, opcional)</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Cintura</label>
              <Input
                type="number"
                step="0.1"
                value={form.waist ?? ""}
                onChange={(e) => update("waist", numberField(e.target.value))}
              />
              <FieldError message={errors.waist} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Pecho</label>
              <Input
                type="number"
                step="0.1"
                value={form.chest ?? ""}
                onChange={(e) => update("chest", numberField(e.target.value))}
              />
              <FieldError message={errors.chest} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Brazo</label>
              <Input
                type="number"
                step="0.1"
                value={form.arm ?? ""}
                onChange={(e) => update("arm", numberField(e.target.value))}
              />
              <FieldError message={errors.arm} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Muslo</label>
              <Input
                type="number"
                step="0.1"
                value={form.leg ?? ""}
                onChange={(e) => update("leg", numberField(e.target.value))}
              />
              <FieldError message={errors.leg} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Pantorrilla</label>
              <Input
                type="number"
                step="0.1"
                value={form.calf ?? ""}
                onChange={(e) => update("calf", numberField(e.target.value))}
              />
              <FieldError message={errors.calf} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Cadera</label>
              <Input
                type="number"
                step="0.1"
                value={form.hip ?? ""}
                onChange={(e) => update("hip", numberField(e.target.value))}
              />
              <FieldError message={errors.hip} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Grasa corporal (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={form.bodyFat ?? ""}
              onChange={(e) => update("bodyFat", numberField(e.target.value))}
            />
            <FieldError message={errors.bodyFat} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Masa muscular (kg)
            </label>
            <Input
              type="number"
              step="0.1"
              value={form.muscleMass ?? ""}
              onChange={(e) => update("muscleMass", numberField(e.target.value))}
            />
            <FieldError message={errors.muscleMass} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Observaciones</label>
          <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        {formError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar medición"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
