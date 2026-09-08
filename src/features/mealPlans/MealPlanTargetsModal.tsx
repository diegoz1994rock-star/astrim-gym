import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { validateMealPlanTargetsForm } from "@/lib/domain/mealPlanValidation";
import type { MealPlanTargetsValidationErrors } from "@/lib/domain/mealPlanValidation";
import * as mealPlanService from "@/lib/services/mealPlanService";
import { MealPlanTargetsValidationError, CategoryTargetsValidationError } from "@/lib/services/mealPlanService";
import {
  CATEGORY_TARGET_UNIT_OPTIONS,
  mealPlanToTargetsFormInput,
  type CategoryTargetListItem,
  type CategoryTargetUnit,
  type MealPlanListItem,
  type MealPlanTargetsFormInput,
} from "@/types/mealPlan";

interface MealPlanTargetsModalProps {
  open: boolean;
  gymId: string;
  mealPlan: MealPlanListItem | null;
  categoryTargets: CategoryTargetListItem[];
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

/** Convierte el valor de un <input type="number"> a number|null, tolerando el campo vacío. */
function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Fórmula estándar (Atwater): proteína y carbohidratos 4 kcal/g, grasa 9 kcal/g. */
function computeCalories(protein: number | null, carbs: number | null, fat: number | null): number {
  return Math.round((protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9);
}

/**
 * Metas diarias del plan: calorías (calculadas solas, no se tipean),
 * proteína/carbohidratos/grasa, y verdura/fruta (que en realidad son metas
 * por categoría — ver el comentario de MealPlanTargetsFormInput). Todo en
 * un solo formulario para que el entrenador no tenga que ir a una sección
 * aparte por verdura/fruta.
 */
export function MealPlanTargetsModal({
  open,
  gymId,
  mealPlan,
  categoryTargets,
  onClose,
  onSaved,
}: MealPlanTargetsModalProps) {
  const [form, setForm] = useState<MealPlanTargetsFormInput>(() => ({
    dailyCaloriesTarget: null,
    dailyProteinTarget: null,
    dailyCarbsTarget: null,
    dailyFatTarget: null,
    verduraTarget: null,
    verduraUnit: "g",
    frutaTarget: null,
    frutaUnit: "porciones",
  }));
  const [errors, setErrors] = useState<MealPlanTargetsValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open && mealPlan) {
      setForm(mealPlanToTargetsFormInput(mealPlan, categoryTargets));
      setErrors({});
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mealPlan]);

  function update<K extends keyof MealPlanTargetsFormInput>(key: K, value: MealPlanTargetsFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const computedCalories = computeCalories(form.dailyProteinTarget, form.dailyCarbsTarget, form.dailyFatTarget);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!mealPlan) return;

    const payload: MealPlanTargetsFormInput = { ...form, dailyCaloriesTarget: computedCalories };
    const fieldErrors = validateMealPlanTargetsForm(payload);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await mealPlanService.updateMealPlanTargets(gymId, mealPlan.id, payload);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof MealPlanTargetsValidationError) {
        setErrors(err.errors);
      } else if (err instanceof CategoryTargetsValidationError) {
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudieron guardar las metas diarias.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Metas diarias" description={mealPlan?.name} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Calorías (kcal)</label>
          <Input type="number" value={computedCalories} disabled className="opacity-70" />
          <p className="mt-1 text-xs text-muted-foreground">
            Se calcula sola: proteína×4 + carbohidratos×4 + grasa×9. Es la suma de todo lo demás.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Proteína (g)</label>
            <Input
              type="number"
              min={0}
              value={form.dailyProteinTarget ?? ""}
              onChange={(e) => update("dailyProteinTarget", parseOptionalNumber(e.target.value))}
            />
            <FieldError message={errors.dailyProteinTarget} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Carbohidratos (g)</label>
            <Input
              type="number"
              min={0}
              value={form.dailyCarbsTarget ?? ""}
              onChange={(e) => update("dailyCarbsTarget", parseOptionalNumber(e.target.value))}
            />
            <FieldError message={errors.dailyCarbsTarget} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Grasa (g)</label>
            <Input
              type="number"
              min={0}
              value={form.dailyFatTarget ?? ""}
              onChange={(e) => update("dailyFatTarget", parseOptionalNumber(e.target.value))}
            />
            <FieldError message={errors.dailyFatTarget} />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Verdura</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={form.verduraTarget ?? ""}
                  onChange={(e) => update("verduraTarget", parseOptionalNumber(e.target.value))}
                  className="flex-1"
                />
                <Select
                  value={form.verduraUnit}
                  onChange={(e) => update("verduraUnit", e.target.value as CategoryTargetUnit)}
                  className="w-28"
                >
                  {CATEGORY_TARGET_UNIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <FieldError message={errors.verduraTarget} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Fruta</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={form.frutaTarget ?? ""}
                  onChange={(e) => update("frutaTarget", parseOptionalNumber(e.target.value))}
                  className="flex-1"
                />
                <Select
                  value={form.frutaUnit}
                  onChange={(e) => update("frutaUnit", e.target.value as CategoryTargetUnit)}
                  className="w-28"
                >
                  {CATEGORY_TARGET_UNIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <FieldError message={errors.frutaTarget} />
            </div>
          </div>
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
              "Guardar metas"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
