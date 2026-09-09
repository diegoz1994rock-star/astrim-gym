import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Cloud, CloudOff, DownloadCloud, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isCloudConfigured } from "@/lib/cloud/firebase";
import { currentCloudUser, onCloudAuthChanged, signInGymOwner, signOutCloud } from "@/lib/cloud/cloudAuth";
import { seedExerciseLibrary } from "@/lib/cloud/seedExerciseLibrary";
import { restoreFromCloud, type RestoreSummary } from "@/lib/cloud/cloudRestoreService";
import { buildOptimizedLogoBase64 } from "@/lib/cloud/logoImage";
import * as outboxRepository from "@/lib/repositories/outboxRepository";
import * as gymRepository from "@/lib/repositories/gymRepository";
import { syncNow } from "@/lib/sync/OutboxSyncWorker";

interface CloudTabProps {
  gymId: string;
}

interface SyncStats {
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
}

export function CloudTab({ gymId }: CloudTabProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(currentCloudUser()?.email ?? null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [stats, setStats] = useState<SyncStats>({ pending: 0, failed: 0, lastSyncedAt: null });
  const [failedItems, setFailedItems] = useState<outboxRepository.FailedOutboxItem[]>([]);
  const [syncBusy, setSyncBusy] = useState<null | "sync" | "backfill" | "retry">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreSummary | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [brandColor, setBrandColor] = useState("");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [brandBusy, setBrandBusy] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);

  useEffect(() => onCloudAuthChanged((u) => setSignedInEmail(u?.email ?? null)), []);

  const refreshStats = useCallback(async () => {
    const [pending, failed, lastSyncedAt, failedItems] = await Promise.all([
      outboxRepository.countByStatus("PENDING"),
      outboxRepository.countByStatus("FAILED"),
      outboxRepository.lastSyncedAt(),
      outboxRepository.listFailed(),
    ]);
    setStats({ pending, failed, lastSyncedAt });
    setFailedItems(failedItems);
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    let cancelled = false;
    gymRepository.findGymCloudBrand(gymId).then((row) => {
      if (cancelled || !row) return;
      setBrandColor(row.brand_color ?? "");
      setLogoBase64(row.logo_base64);
      setLogoPath(row.logo_path);
    });
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInGymOwner(email, password);
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "No se pudo iniciar sesión en la nube.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function runSync(kind: "sync" | "backfill" | "retry") {
    setSyncBusy(kind);
    setError(null);
    setMessage(null);
    try {
      if (kind === "backfill") await outboxRepository.backfillAll();
      if (kind === "retry") await outboxRepository.retryFailed();
      if (kind === "sync") await outboxRepository.releaseBackoff();
      const result = await syncNow();
      await refreshStats();
      if (result.skipped) {
        setError("Sincronización omitida: revisa la conexión y que la sesión de la nube esté activa.");
      } else {
        setMessage(`Sincronizados ${result.synced} de ${result.processed}. Fallidos: ${result.failed}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar.");
    } finally {
      setSyncBusy(null);
    }
  }

  async function handleSaveBrand(regenerateLogo: boolean) {
    setBrandBusy(true);
    setBrandSaved(false);
    setError(null);
    try {
      let nextLogo = logoBase64;
      if (regenerateLogo) {
        if (!logoPath) {
          setError("Este gimnasio no tiene un logo cargado en Configuración → General.");
          return;
        }
        nextLogo = await buildOptimizedLogoBase64(logoPath);
        setLogoBase64(nextLogo);
      }
      await gymRepository.updateGymCloudBrand(gymId, brandColor.trim() || null, nextLogo);
      await syncNow();
      await refreshStats();
      setBrandSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la marca.");
    } finally {
      setBrandBusy(false);
    }
  }

  async function handleRestore() {
    setRestoreBusy(true);
    setRestoreError(null);
    setRestoreResult(null);
    try {
      const result = await restoreFromCloud(gymId);
      setRestoreResult(result);
      setRestoreConfirm(false);
      await refreshStats();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "No se pudo restaurar desde la nube.");
    } finally {
      setRestoreBusy(false);
    }
  }

  async function handleSeed() {
    setSyncBusy("sync");
    setError(null);
    setMessage(null);
    try {
      const { count } = await seedExerciseLibrary();
      setMessage(`Biblioteca global subida: ${count} ejercicios.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la biblioteca.");
    } finally {
      setSyncBusy(null);
    }
  }

  if (!isCloudConfigured) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CloudOff className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            La sincronización con la nube no está configurada. Completa las variables{" "}
            <code className="rounded bg-muted px-1">VITE_FIREBASE_*</code> en{" "}
            <code className="rounded bg-muted px-1">.env.local</code> y reinicia la app. Ver{" "}
            <code className="rounded bg-muted px-1">docs/FIREBASE.md</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cuenta de la nube del gimnasio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            ID de tu gimnasio (para el <code className="rounded bg-muted px-1">userIndex</code> del
            bootstrap, ver <code className="rounded bg-muted px-1">docs/FIREBASE.md</code>):{" "}
            <code className="select-all rounded bg-muted px-1 text-foreground">{gymId}</code>
          </p>
          {signedInEmail ? (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Cloud className="h-4 w-4 text-success" />
                Sesión activa: <strong>{signedInEmail}</strong>
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={() => void signOutCloud()}>
                Cerrar sesión de la nube
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Inicia sesión con la cuenta de Firebase del dueño del gimnasio. Es lo que autoriza
                subir los datos a Firestore.
              </p>
              <Input
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {authError && <p className="text-xs text-danger">{authError}</p>}
              <Button type="submit" disabled={authBusy} className="w-fit">
                {authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar sesión"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronización</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="rounded-md border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
            La sincronización es automática: cada cambio que hagas se sube a la nube al instante.
            Estos botones son solo por si necesitás forzarla.
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-2xl font-semibold text-foreground">{stats.pending}</div>
              <div className="text-muted-foreground">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">{stats.failed}</div>
              <div className="text-muted-foreground">Fallidos</div>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {stats.lastSyncedAt ? new Date(stats.lastSyncedAt + "Z").toLocaleString() : "—"}
              </div>
              <div className="text-muted-foreground">Última sincronización</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={syncBusy !== null} onClick={() => void runSync("sync")}>
              {syncBusy === "sync" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar ahora
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={syncBusy !== null}
              onClick={() => void runSync("backfill")}
            >
              {syncBusy === "backfill" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Sincronización inicial completa
            </Button>
            {stats.failed > 0 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={syncBusy !== null}
                onClick={() => void runSync("retry")}
              >
                Reintentar fallidos
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={syncBusy !== null}
              onClick={() => void handleSeed()}
            >
              Subir biblioteca de ejercicios
            </Button>
          </div>

          {message && (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}

          {failedItems.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-danger/25 bg-danger/5 p-3">
              <p className="text-xs font-medium text-danger">
                Detalle de lo que está fallando (para diagnosticar):
              </p>
              <div className="flex flex-col gap-1.5 text-xs">
                {failedItems.map((item, i) => (
                  <div key={`${item.entity}-${item.entityId}-${i}`} className="text-muted-foreground">
                    <span className="font-mono text-foreground">
                      {item.entity}/{item.entityId}
                    </span>{" "}
                    ({item.attempts} intentos): {item.lastError ?? "—"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {signedInEmail && (
        <Card>
          <CardHeader>
            <CardTitle>Recuperar datos (PC nueva)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Si formateaste o cambiaste de computadora: instalá el panel, iniciá sesión con la
              cuenta de la nube y usá esto para traer de vuelta desde Firebase{" "}
              <strong>entrenadores, clientes (con su usuario y contraseña de la app), ejercicios del
              gimnasio, rutinas y planes de alimentación</strong>. No trae historial ni membresías,
              pagos, asistencias, medidas ni asignaciones — eso queda en la nube pero no se descarga.
              No pisa nada que ya tengas cargado.
            </p>

            {!restoreConfirm ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-fit"
                disabled={restoreBusy}
                onClick={() => {
                  setRestoreConfirm(true);
                  setRestoreResult(null);
                  setRestoreError(null);
                }}
              >
                <DownloadCloud className="h-4 w-4" />
                Restaurar desde la nube
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-foreground">¿Traer los datos del gimnasio desde la nube?</span>
                <Button type="button" size="sm" disabled={restoreBusy} onClick={() => void handleRestore()}>
                  {restoreBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                  Sí, restaurar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={restoreBusy}
                  onClick={() => setRestoreConfirm(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}

            {restoreResult && (
              <div className="flex flex-col gap-1 rounded-md border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Restauración completa
                </span>
                <span className="text-foreground">
                  {restoreResult.trainers} entrenadores · {restoreResult.clients} clientes ·{" "}
                  {restoreResult.exercises} ejercicios · {restoreResult.routines} rutinas (
                  {restoreResult.routineExercises} ejercicios) · {restoreResult.mealPlans} planes de
                  alimentación ({restoreResult.mealPlanItems} items, {restoreResult.mealPlanTargets}{" "}
                  metas)
                </span>
                {restoreResult.errors.length > 0 && (
                  <span className="text-warning">
                    Con avisos: {restoreResult.errors.join(" · ")}
                  </span>
                )}
              </div>
            )}
            {restoreError && <p className="text-sm text-danger">{restoreError}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Marca de la app de clientes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Color de acento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#22c55e"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                />
                <Input
                  value={brandColor}
                  placeholder="#22C55E"
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
            {logoBase64 && (
              <img
                src={`data:image/webp;base64,${logoBase64}`}
                alt="Logo app"
                className="h-12 w-12 rounded object-contain"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            El logo para la app se genera a partir del logo de Configuración → General, reducido y
            optimizado (nunca se sube el archivo original).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={brandBusy} onClick={() => void handleSaveBrand(false)}>
              {brandBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar color"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={brandBusy}
              onClick={() => void handleSaveBrand(true)}
            >
              Regenerar logo para la app
            </Button>
            {brandSaved && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Guardado.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
