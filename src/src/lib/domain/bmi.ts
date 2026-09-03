/**
 * El IMC nunca se almacena: se calcula siempre a partir de peso/altura
 * reales, igual que el estado de membresía se calcula siempre a partir de
 * fechas (membershipStatus.ts). La altura se maneja en metros en todo el
 * proyecto (mismo criterio que clients.height, ej. 1.78).
 */
export function computeBmi(weightKg: number | null, heightMeters: number | null): number | null {
  if (weightKg === null || heightMeters === null) return null;
  if (weightKg <= 0 || heightMeters <= 0) return null;
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightMeters)) return null;

  return weightKg / (heightMeters * heightMeters);
}

export type BmiCategory = "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESE";

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  UNDERWEIGHT: "Bajo peso",
  NORMAL: "Normal",
  OVERWEIGHT: "Sobrepeso",
  OBESE: "Obesidad",
};

export function classifyBmi(bmi: number | null): BmiCategory | null {
  if (bmi === null) return null;
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 25) return "NORMAL";
  if (bmi < 30) return "OVERWEIGHT";
  return "OBESE";
}
