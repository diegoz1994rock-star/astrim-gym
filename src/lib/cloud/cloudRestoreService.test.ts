import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integración: migraciones REALES sobre SQLite en memoria + una nube
 * simulada en memoria. Verifica que una PC nueva recupera el gimnasio
 * completo (incluido el historial) y que no re-sube nada a la nube.
 */

// ---- SQLite real con todas las migraciones ----
let sqlite: DatabaseSync;
const toPositional = (sql: string) => sql.replace(/\$(\d+)/g, "?$1");
const fakeDb = {
  select: async <T,>(sql: string, params: unknown[] = []) =>
    sqlite.prepare(toPositional(sql)).all(...(params as never[])) as T,
  execute: async (sql: string, params: unknown[] = []) => {
    const r = sqlite.prepare(toPositional(sql)).run(...(params as never[]));
    return { rowsAffected: Number(r.changes) };
  },
};
vi.mock("../db/client", () => ({
  getDb: async () => fakeDb,
  setMutationListener: () => {},
}));

// ---- Nube simulada: path "a/b/c" -> datos ----
const cloud = new Map<string, Record<string, unknown>>();
vi.mock("./firebase", () => ({ isCloudConfigured: true, getCloudDb: () => ({}) }));
vi.mock("./cloudAuth", () => ({ currentCloudUser: () => ({ uid: "owner" }) }));
vi.mock("firebase/firestore", () => {
  type Ref = { path: string; filters: [string, unknown][] };
  const snapOf = (p: string) => ({ id: p.split("/").pop()!, data: () => cloud.get(p)! });
  return {
    collection: (_db: unknown, ...segs: string[]): Ref => ({ path: segs.join("/"), filters: [] }),
    doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
    where: (field: string, _op: string, value: unknown) => [field, value],
    query: (ref: Ref, ...filters: [string, unknown][]) => ({ ...ref, filters }),
    getDoc: async (ref: { path: string }) => ({
      exists: () => cloud.has(ref.path),
      data: () => cloud.get(ref.path),
    }),
    getDocs: async (ref: Ref) => {
      const depth = ref.path.split("/").length + 1;
      const docs = [...cloud.keys()]
        .filter((k) => k.startsWith(ref.path + "/") && k.split("/").length === depth)
        .filter((k) => ref.filters.every(([f, v]) => cloud.get(k)![f] === v))
        .map(snapOf);
      return { docs };
    },
  };
});

import { isLocalGymEmpty, restoreFromCloud, restoredCount } from "./cloudRestoreService";

const G = "gym_test";
const migrationsDir = path.resolve(__dirname, "../../../src-tauri/migrations");

function seedCloud() {
  cloud.clear();
  const put = (p: string, d: Record<string, unknown>) => cloud.set(p, d);
  put(`gyms/${G}`, { name: "Test Gym", phone: "300", brandColor: "#22C55E" });
  put(`gyms/${G}/trainers/t1`, { gymId: G, name: "Carlos", status: "ACTIVE" });
  put(`gyms/${G}/membershipPlans/plan1`, { gymId: G, name: "Mensual", durationDays: 30, price: 80000, active: true });
  put(`gyms/${G}/routines/r1`, { gymId: G, name: "Fuerza", status: "ACTIVE" });
  // Ejercicio de la biblioteca global con un id de OTRA instalación: se re-vincula por nombre.
  put(`gyms/${G}/routineExercises/re1`, { gymId: G, routineId: "r1", exerciseId: "otro_id", exerciseName: "Sentadilla", sets: 4, reps: 10, sortOrder: 0 });
  put(`gyms/${G}/classes/cl1`, { gymId: G, classTypeId: "tipo_de_otra_pc", classTypeName: "Spinning Pro", trainerId: "t1", name: "Spinning", date: "2026-11-10", startTime: "07:00", endTime: "08:00", capacity: 10, status: "PROGRAMADA" });
  put(`gyms/${G}/mealPlans/mp1`, { gymId: G, name: "Definición", status: "ACTIVE" });
  put(`gyms/${G}/mealPlanItems/mpi1`, { gymId: G, mealPlanId: "mp1", foodId: "no_existe", foodName: "Comida rara", mealType: "DESAYUNO", quantity: 100, unit: "g" });
  put(`clients/c1`, { gymId: G, name: "Pedro", email: "pedro@gmail.com", status: "ACTIVE", trainerId: "t1", cloudUid: "uid_pedro", attendanceCode: "4321" });
  put(`clients/c1/memberships/m1`, { gymId: G, clientId: "c1", planId: "plan1", startDate: "2026-11-01", endDate: "2026-12-01", price: 80000, paymentStatus: "PAID" });
  // Plan borrado en la nube: la membresía no se pierde, se recrea el plan inactivo.
  put(`clients/c1/memberships/m2`, { gymId: G, clientId: "c1", planId: "plan_borrado", planName: "Mensual", startDate: "2026-10-01", endDate: "2026-10-31", price: 70000, paymentStatus: "PAID" });
  put(`clients/c1/payments/p1`, { gymId: G, clientId: "c1", membershipId: "m1", amount: 80000, date: "2026-11-01", method: "CASH", status: "PAID", concept: "Mensualidad" });
  put(`clients/c1/attendance/a1`, { gymId: G, clientId: "c1", membershipId: "m1", date: "2026-11-02", checkIn: "07:01:00", status: "PRESENT", entryMethod: "CODE" });
  put(`clients/c1/measurements/me1`, { gymId: G, clientId: "c1", date: "2026-11-01", weight: 80 });
  put(`clients/c1/routineAssignments/ra1`, { gymId: G, clientId: "c1", routineId: "r1", startDate: "2026-11-01" });
  put(`clients/c1/mealPlanAssignments/mpa1`, { gymId: G, clientId: "c1", mealPlanId: "mp1" });
  put(`clients/c1/classEnrollments/ce1`, { gymId: G, clientId: "c1", classId: "cl1", status: "ENROLLED" });
  // De otro gimnasio: nunca debe bajar.
  put(`clients/intruso`, { gymId: "otro_gym", name: "No", status: "ACTIVE" });
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(path.join(migrationsDir, f), "utf8"));
  }
  // Lo que deja el login por la nube antes de restaurar.
  sqlite.exec(`INSERT INTO gyms (id, name, slug) VALUES ('${G}', 'Test Gym', '${G}')`);
  sqlite.exec("DELETE FROM outbox");
  seedCloud();
});

const one = <T,>(sql: string) => sqlite.prepare(sql).get() as T;
const count = (sql: string) => Number((one<{ n: number }>(sql)).n);

describe("restoreFromCloud", () => {
  it("recupera el gimnasio completo con su historial en una PC vacía", async () => {
    expect(await isLocalGymEmpty(G)).toBe(true);
    const progress: string[] = [];
    const s = await restoreFromCloud(G, (m) => progress.push(m));

    expect(s.errors).toEqual([]);
    expect(s).toMatchObject({
      gymProfile: true, trainers: 1, clients: 1, routines: 1, routineExercises: 1,
      classes: 1, classTypes: 1, mealPlans: 1, mealPlanItems: 1,
      memberships: 2, payments: 1, attendance: 1, measurements: 1,
      routineAssignments: 1, mealPlanAssignments: 1, classEnrollments: 1,
    });
    expect(s.membershipPlans).toBe(2); // el real + el recreado
    expect(restoredCount(s)).toBeGreaterThan(10);
    expect(progress.some((m) => m.includes("1 de 1"))).toBe(true);

    expect(one<{ attendance_code: string; cloud_uid: string; trainer_id: string }>(
      "SELECT attendance_code, cloud_uid, trainer_id FROM clients WHERE id = 'c1'",
    )).toMatchObject({ attendance_code: "4321", cloud_uid: "uid_pedro", trainer_id: "t1" });
    expect(count("SELECT COUNT(*) n FROM clients WHERE id = 'intruso'")).toBe(0);
    // Re-vinculado por nombre al ejercicio de la biblioteca de ESTA instalación.
    expect(one<{ name: string; gym_id: string | null }>(
      "SELECT e.name, e.gym_id FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id WHERE re.id = 're1'",
    )).toEqual({ name: "Sentadilla", gym_id: null });
    expect(one<{ name: string }>(
      "SELECT ct.name FROM classes c JOIN class_types ct ON ct.id = c.class_type_id WHERE c.id = 'cl1'",
    ).name).toBe("Spinning Pro");
    expect(one<{ active: number }>("SELECT active FROM membership_plans WHERE id = 'plan_borrado'").active).toBe(0);
    expect(one<{ custom_food_name: string; food_id: string | null }>(
      "SELECT custom_food_name, food_id FROM meal_plan_items WHERE id = 'mpi1'",
    )).toEqual({ custom_food_name: "Comida rara", food_id: null });
    expect(one<{ phone: string; brand_color: string }>(`SELECT phone, brand_color FROM gyms WHERE id = '${G}'`))
      .toEqual({ phone: "300", brand_color: "#22C55E" });

    // Lo que bajó de la nube no se vuelve a subir.
    expect(count("SELECT COUNT(*) n FROM outbox WHERE status = 'PENDING'")).toBe(0);
    expect(await isLocalGymEmpty(G)).toBe(false);
  });

  it("es idempotente: correrla de nuevo no duplica nada", async () => {
    await restoreFromCloud(G);
    const again = await restoreFromCloud(G);
    expect(again.errors).toEqual([]);
    expect(restoredCount(again)).toBe(0);
    expect(count("SELECT COUNT(*) n FROM payments")).toBe(1);
    expect(count("SELECT COUNT(*) n FROM attendance")).toBe(1);
  });

  it("no pisa lo que ya existe localmente", async () => {
    sqlite.exec(`INSERT INTO clients (id, gym_id, name, status) VALUES ('c1', '${G}', 'Pedro editado', 'ACTIVE')`);
    await restoreFromCloud(G);
    expect(one<{ name: string }>("SELECT name FROM clients WHERE id = 'c1'").name).toBe("Pedro editado");
    expect(count("SELECT COUNT(*) n FROM payments WHERE client_id = 'c1'")).toBe(1);
  });
});
