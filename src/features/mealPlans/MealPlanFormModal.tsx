import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateMealPlanForm } from "@/lib/domain/mealPlanValidation";
import type { MealPlanValidationErrors } from "@/lib/domain/mealPlanValidation";
import * as mealPlanService from "@/lib/services/mealPlanService";
import { MealPlanValidationError } from "@/lib/services/mealPlanService";
import {
  MEAL_PLAN_GOAL_OPTIONS,
  MEAL_PLAN_STATUS_LABELS,
  emptyMealPlanForm,
  mealPlanToFormInput,
  type MealPlanFormInput,
  type MealPlanGoal,
  type MealPlanListItem,
} from "@/types/mealPlan";

interface MealPlanFormModalProps {
  open: boolean;
  gymId: string;
  mealPlan: MealPlanListItem | null;
  onClose: () => void;
  onSaved: (mealPlanId: string) => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

function toFormInput(mealPlan: MealPlanListItem | null): MealPlanFormInput {
  return mealPlan ? mealPlanToFormInput(mealPlan) : emptyMealPlanForm();
}

/**
 * Solo la identidad básica del plan (nombre/objetivo/estado/descripción):
 * lo mínimo para crear la fila. Metas diarias, categorías, alimentos
 * permitidos, reglas y clientes se configuran aparte desde
 * MealPlanDetailPage una vez creado — así se evita un formulario gigante.
 */
export function MealPlanFormModal({ open, gymId, mealPlan, onClose, onSaved }: MealPlanFormModalProps) {
  const [form, setForm] = useState<MealPlanFormInput>(() => toFormInput(mealPlan));
  const [errors, setErrors] = useState<MealPlanValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormInput(mealPlan));
      setErrors({});
      setFormError(null);
    }
  }, [open, mealPlan]);

  function update<K extends keyof MealPlanFormInput>(key: K, value: MealPlanFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateMealPlanForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const id = mealPlan
        ? await mealPlanService.updateMealPlan(gymId, mealPlan.id, form).then(() => mealPlan.id)
        : await mealPlanService.createMealPlan(gymId, form);
      onSaved(id);
      onClose();
    } catch (err) {
      if (err instanceof MealPlanValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar el plan de alimentación.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mealPlan ? "Editar plan de alimentación" : "Nuevo plan de alimentación"}
      description={
        mealPlan
          ? mealPlan.name
          : "Crea la plantilla; luego configuras metas, categorías y alimentos permitidos."
      }
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Nombre del plan *</label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ej: Plan de definición"
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Objetivo</label>
          <Select
            value={form.goal ?? ""}
            onChange={(e) => update("goal", (e.target.value || null) as MealPlanGoal | null)}
          >
            <option value="">Sin objetivo definido</option>
            {MEAL_PLAN_GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError message={errors.goal} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
          <Select
            value={form.status}
            onChange={(e) => update("status", e.target.value as MealPlanFormInput["status"])}
          >
            {Object.entries(MEAL_PLAN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Descripción</label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Ej: Déficit calórico moderado, enfoque en saciedad"
          />
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
              "Guardar plan"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
