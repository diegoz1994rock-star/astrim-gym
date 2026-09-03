import { describe, expect, it } from "vitest";
import {
  formatRoutineExerciseSummary,
  getCardioEquipmentProfile,
  getExerciseConfigurationMode,
  hasLegacyStrengthValues,
  resolveEffectiveMode,
} from "./exerciseConfigMode";

const NO_TIME = { timeValue: null, timeUnit: null } as const;
const NO_STRENGTH = { sets: null, reps: null, weight: null, restSeconds: null } as const;
const NO_INTENSITY = {
  speedKmh: null,
  inclinePercent: null,
  resistanceLevel: null,
  rpm: null,
  intensityLabel: null,
} as const;

describe("getExerciseConfigurationMode", () => {
  it("1. STRENGTH para ejercicios tradicionales (Press de banca)", () => {
    expect(getExerciseConfigurationMode("STRENGTH")).toBe("STRENGTH");
  });

  it("CARDIO_TIME para ejercicios de tipo CARDIO", () => {
    expect(getExerciseConfigurationMode("CARDIO")).toBe("CARDIO_TIME");
  });

  it("MOBILITY para ejercicios de movilidad o flexibilidad", () => {
    expect(getExerciseConfigurationMode("MOBILITY")).toBe("MOBILITY");
    expect(getExerciseConfigurationMode("FLEXIBILITY")).toBe("MOBILITY");
  });

  it("STRENGTH por defecto para tipos sin clasificar (kettlebell/funcional/pliometría)", () => {
    expect(getExerciseConfigurationMode("FUNCTIONAL")).toBe("STRENGTH");
    expect(getExerciseConfigurationMode("PLYOMETRIC")).toBe("STRENGTH");
    expect(getExerciseConfigurationMode(null)).toBe("STRENGTH");
  });
});

describe("getCardioEquipmentProfile (basado en metadatos, no en el nombre)", () => {
  it("2. Caminadora → TREADMILL", () => {
    expect(getCardioEquipmentProfile("Caminadora")).toBe("TREADMILL");
  });

  it("3. Bicicleta → BIKE", () => {
    expect(getCardioEquipmentProfile("Bicicleta")).toBe("BIKE");
  });

  it("4. Remo → ROWER", () => {
    expect(getCardioEquipmentProfile("Remo")).toBe("ROWER");
  });

  it("5. Escaladora → CLIMBER", () => {
    expect(getCardioEquipmentProfile("Escaladora")).toBe("CLIMBER");
  });

  it("cualquier otro equipamiento cardio (Battle Rope, HIIT, etc.) → GENERIC", () => {
    expect(getCardioEquipmentProfile("Battle Rope")).toBe("GENERIC");
    expect(getCardioEquipmentProfile(null)).toBe("GENERIC");
  });
});

describe("compatibilidad con rutinas existentes (fallback a fuerza)", () => {
  it("un ejercicio sin datos de fuerza respeta el modo del catálogo", () => {
    expect(hasLegacyStrengthValues(NO_STRENGTH)).toBe(false);
    expect(resolveEffectiveMode(false, "CARDIO_TIME")).toBe("CARDIO_TIME");
  });

  it("si ya tiene series/reps/peso/descanso guardados, se conserva como fuerza aunque el catálogo diga cardio", () => {
    const legacy = { sets: 3, reps: 12, weight: null, restSeconds: null };
    expect(hasLegacyStrengthValues(legacy)).toBe(true);
    expect(resolveEffectiveMode(true, "CARDIO_TIME")).toBe("STRENGTH");
  });
});

describe("formatRoutineExerciseSummary", () => {
  it("ejercicio tradicional muestra series/reps/peso/descanso", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "STRENGTH",
      equipment: "Barra",
      sets: 4,
      reps: 10,
      weight: 60,
      restSeconds: 90,
      notes: null,
      ...NO_TIME,
      ...NO_INTENSITY,
    });
    expect(summary).toBe("4 series · 10 reps · 60 kg · 90 s descanso");
  });

  it("caminadora muestra tiempo, velocidad e inclinación", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Caminadora",
      ...NO_STRENGTH,
      notes: null,
      timeValue: 30,
      timeUnit: "MINUTES",
      speedKmh: 6,
      inclinePercent: 8,
      resistanceLevel: null,
      rpm: null,
      intensityLabel: null,
    });
    expect(summary).toBe("30 minutos · 6 km/h · 8% inclinación");
  });

  it("bicicleta muestra tiempo y resistencia (nivel)", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Bicicleta",
      ...NO_STRENGTH,
      notes: null,
      timeValue: 20,
      timeUnit: "MINUTES",
      speedKmh: null,
      inclinePercent: null,
      resistanceLevel: 5,
      rpm: null,
      intensityLabel: null,
    });
    expect(summary).toBe("20 minutos · Nivel 5");
  });

  it("remo muestra tiempo y resistencia (nivel)", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Remo",
      ...NO_STRENGTH,
      notes: null,
      timeValue: 15,
      timeUnit: "MINUTES",
      speedKmh: null,
      inclinePercent: null,
      resistanceLevel: 7,
      rpm: null,
      intensityLabel: null,
    });
    expect(summary).toBe("15 minutos · Nivel 7");
  });

  it("escaladora muestra tiempo y nivel", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Escaladora",
      ...NO_STRENGTH,
      notes: null,
      timeValue: 15,
      timeUnit: "MINUTES",
      speedKmh: null,
      inclinePercent: null,
      resistanceLevel: 8,
      rpm: null,
      intensityLabel: null,
    });
    expect(summary).toBe("15 minutos · Nivel 8");
  });

  it("cardio genérico (Battle Rope/HIIT) muestra tiempo e intensidad cualitativa", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Battle Rope",
      ...NO_STRENGTH,
      notes: null,
      timeValue: 10,
      timeUnit: "MINUTES",
      speedKmh: null,
      inclinePercent: null,
      resistanceLevel: null,
      rpm: null,
      intensityLabel: "Alta",
    });
    expect(summary).toBe("10 minutos · Intensidad: Alta");
  });

  it("tiempo en horas se etiqueta correctamente", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Bicicleta",
      ...NO_STRENGTH,
      notes: null,
      timeValue: 1,
      timeUnit: "HOURS",
      speedKmh: null,
      inclinePercent: null,
      resistanceLevel: 6,
      rpm: null,
      intensityLabel: null,
    });
    expect(summary).toBe("1 horas · Nivel 6");
  });

  it("una rutina de cardio con datos de fuerza heredados se sigue mostrando como fuerza", () => {
    const summary = formatRoutineExerciseSummary({
      exerciseType: "CARDIO",
      equipment: "Bicicleta",
      sets: 3,
      reps: 15,
      weight: null,
      restSeconds: null,
      notes: null,
      timeValue: null,
      timeUnit: null,
      speedKmh: null,
      inclinePercent: null,
      resistanceLevel: null,
      rpm: null,
      intensityLabel: null,
    });
    expect(summary).toBe("3 series · 15 reps");
  });
});
