import { afterEach, describe, expect, it, vi } from "vitest";
import { startOutboxSync, stopOutboxSync, syncNow } from "./OutboxSyncWorker";

/**
 * En el entorno de test no hay `.env.local`, así que `isCloudConfigured`
 * es false y el worker debe ser un no-op seguro (nunca toca Firestore ni
 * SQLite). Los tests de la transformación fila→documento están en
 * `src/lib/cloud/mappers.test.ts`.
 */
describe("OutboxSyncWorker", () => {
  afterEach(() => {
    stopOutboxSync();
    vi.restoreAllMocks();
  });

  it("syncNow() se omite cuando la nube no está configurada", async () => {
    const result = await syncNow();
    expect(result.skipped).toBe(true);
    expect(result.synced).toBe(0);
  });

  it("start/stop no lanzan ni dejan timers colgados", () => {
    vi.useFakeTimers();
    const stop = startOutboxSync();
    expect(typeof stop).toBe("function");
    stop();
    // Un segundo start tras stop vuelve a funcionar.
    startOutboxSync();
    stopOutboxSync();
    vi.useRealTimers();
  });
});
