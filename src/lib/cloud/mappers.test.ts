import { describe, expect, it } from "vitest";
import { cloudPath, mapRowToData, type Row } from "./mappers";

describe("cloudPath", () => {
  it("entidades del gimnasio", () => {
    expect(cloudPath("gyms", "g1", { gymId: "g1" })).toEqual(["gyms", "g1"]);
    expect(cloudPath("routines", "r1", { gymId: "g1" })).toEqual(["gyms", "g1", "routines", "r1"]);
    expect(cloudPath("routine_exercises", "re1", { gymId: "g1", routineId: "r1" })).toEqual([
      "gyms",
      "g1",
      "routineExercises",
      "re1",
    ]);
  });

  it("entidades por cliente", () => {
    expect(cloudPath("clients", "c1", { gymId: "g1", clientId: "c1" })).toEqual(["clients", "c1"]);
    expect(
      cloudPath("routine_assignments", "ra1", { gymId: "g1", clientId: "c1", routineId: "r1" }),
    ).toEqual(["clients", "c1", "routineAssignments", "ra1"]);
    expect(cloudPath("memberships", "m1", { gymId: "g1", clientId: "c1" })).toEqual([
      "clients",
      "c1",
      "memberships",
      "m1",
    ]);
  });

  it("falla si falta una coordenada requerida", () => {
    expect(() => cloudPath("routines", "r1", {})).toThrow(/gymId/);
    expect(() => cloudPath("memberships", "m1", { gymId: "g1" })).toThrow(/clientId/);
  });
});

describe("mapRowToData", () => {
  it("clients: nunca copia datos privados", () => {
    const row: Row = {
      id: "c1",
      gym_id: "g1",
      name: "Diego",
      email: "d@x.com",
      goal: "MUSCLE_GAIN",
      trainer_id: "t1",
      trainer_name: "Carlos",
      status: "ACTIVE",
      // privados que NO deben salir:
      face_embedding: "[0.1,0.2]",
      face_consent: 1,
      photo_path: "/local/photo.jpg",
      observations: "nota interna",
      weight: 80,
      address: "calle falsa 123",
      attendance_code: "1234",
    };
    const data = mapRowToData("clients", row);
    expect(data.name).toBe("Diego");
    expect(data.trainerName).toBe("Carlos");
    for (const forbidden of [
      "face_embedding",
      "faceEmbedding",
      "face_consent",
      "photo_path",
      "photoPath",
      "observations",
      "weight",
      "address",
      "attendance_code",
      "attendanceCode",
      "password_hash",
    ]) {
      expect(data).not.toHaveProperty(forbidden);
    }
  });

  it("gyms: incluye marca y logo, normaliza vacíos a null, NO toca licencia", () => {
    const data = mapRowToData("gyms", {
      id: "g1",
      name: "Gym Demo",
      slug: "gym-demo",
      license_status: "ACTIVE",
      brand_color: "#22C55E",
      logo_base64: "AAA",
      phone: "",
    });
    expect(data).toMatchObject({
      name: "Gym Demo",
      brandColor: "#22C55E",
      logoBase64: "AAA",
      phone: null,
    });
    // La licencia la administra la consola de operador, no el panel.
    expect(data).not.toHaveProperty("licenseStatus");
  });

  it("routine_assignments: denormaliza nombre y conteo de la rutina", () => {
    const data = mapRowToData("routine_assignments", {
      id: "ra1",
      gym_id: "g1",
      client_id: "c1",
      routine_id: "r1",
      routine_name: "Pecho + Tríceps",
      routine_status: "ACTIVE",
      exercise_count: 8,
      start_date: "2026-09-01",
      end_date: null,
    });
    expect(data).toMatchObject({
      routineId: "r1",
      routineName: "Pecho + Tríceps",
      routineStatus: "ACTIVE",
      exerciseCount: 8,
      startDate: "2026-09-01",
      endDate: null,
    });
  });

  it("membership_plans: active como booleano", () => {
    expect(mapRowToData("membership_plans", { active: 1 }).active).toBe(true);
    expect(mapRowToData("membership_plans", { active: 0 }).active).toBe(false);
  });
});
