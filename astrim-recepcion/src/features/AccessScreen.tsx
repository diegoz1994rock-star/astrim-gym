import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, LogIn, ScanFace, ShieldAlert, ShieldCheck, ShieldX, Wifi, WifiOff } from "lucide-react";
import { pingServer, registerAccess, registerAccessByFace, type AccessOutcome } from "@/lib/lanClient";
import { enqueuePendingCode, getPendingCount, peekOldestPending, removePending } from "@/lib/offlineQueue";
import { forgetStoredDevice, type StoredDevice } from "@/lib/deviceStorage";
import { NumericKeypad } from "./NumericKeypad";
import { useFaceCamera } from "@/hooks/useFaceCamera";
import { loadFaceModels, detectFace, type FaceQuality } from "@/lib/face/faceEngine";
import { playAccessSound, preloadAccessSounds } from "@/lib/accessSound";

const PING_INTERVAL_MS = 10_000;
const QUEUE_FLUSH_INTERVAL_MS = 8_000;
const RESULT_COUNTDOWN_SECONDS = 5;
const LONG_PRESS_MS = 3_000;
const FACE_DETECTION_INTERVAL_MS = 350;
/** Tiempo máximo intentando reconocer antes de sugerir el código. */
const FACE_NO_MATCH_TIMEOUT_MS = 8_000;

type ConnectionStatus = "ONLINE" | "SYNCING" | "OFFLINE";
type Screen = "KEYPAD" | "FACE" | "LOADING" | "RESULT";
type ResultState = AccessOutcome | { kind: "QUEUED_OFFLINE" } | { kind: "ERROR" };

/** Concedido / registrado -> sonido positivo; el resto -> sonido de error. */
function isPositiveResult(r: ResultState): boolean {
  return (
    r.kind === "ENTRY_ALLOWED" ||
    r.kind === "EXIT_ALLOWED" ||
    r.kind === "DUPLICATE_IGNORED" ||
    r.kind === "QUEUED_OFFLINE"
  );
}

const FACE_QUALITY_MESSAGES: Record<FaceQuality, string> = {
  NO_FACE: "Ubica tu rostro frente a la cámara",
  TOO_FAR: "Acércate un poco más",
  TOO_CLOSE: "Aléjate un poco",
  GOOD: "✓ Rostro detectado",
};

interface AccessScreenProps {
  device: StoredDevice;
  onRevoked: () => void;
  onUnlinked: () => void;
}

export function AccessScreen({ device, onRevoked, onUnlinked }: AccessScreenProps) {
  const [digits, setDigits] = useState("");
  const [screen, setScreen] = useState<Screen>("KEYPAD");
  const [result, setResult] = useState<ResultState | null>(null);
  const [countdown, setCountdown] = useState(RESULT_COUNTDOWN_SECONDS);
  const [connection, setConnection] = useState<ConnectionStatus>("SYNCING");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(getPendingCount());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [faceQuality, setFaceQuality] = useState<FaceQuality>("NO_FACE");
  const [faceMessage, setFaceMessage] = useState<string | null>(null);
  const { videoRef, status: cameraStatus } = useFaceCamera(screen === "FACE");
  const faceBusyRef = useRef(false);
  const faceDoneRef = useRef(false);
  const faceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    preloadAccessSounds();
  }, []);

  // Sonido al mostrar el resultado: positivo si se registró el acceso,
  // de error si fue denegado o falló.
  useEffect(() => {
    if (screen !== "RESULT" || !result) return;
    playAccessSound(isPositiveResult(result) ? "ok" : "denied");
  }, [screen, result]);

  useEffect(() => {
    let cancelled = false;
    async function checkPing() {
      const ok = await pingServer(device.serverHost);
      if (cancelled) return;
      setConnection(ok ? "ONLINE" : "OFFLINE");
      if (ok) setLastSyncAt(new Date());
    }
    checkPing();
    const interval = setInterval(checkPing, PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [device.serverHost]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const oldest = peekOldestPending();
      if (!oldest) return;
      setConnection("SYNCING");
      const response = await registerAccess(device.serverHost, device.apiToken, oldest.code);
      if (response.status === "OK") {
        removePending(oldest.id);
        setPendingCount(getPendingCount());
        setConnection("ONLINE");
        setLastSyncAt(new Date());
      } else if (response.status === "UNAUTHORIZED") {
        onRevoked();
      } else {
        setConnection("OFFLINE");
      }
    }, QUEUE_FLUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [device.serverHost, device.apiToken, onRevoked]);

  useEffect(() => {
    if (screen !== "RESULT") return;
    if (countdown <= 0) {
      setScreen("KEYPAD");
      setResult(null);
      setDigits("");
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  useEffect(() => {
    if (screen !== "FACE") return;
    let cancelled = false;
    setModelsReady(false);
    loadFaceModels().then(() => {
      if (!cancelled) setModelsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [screen]);

  /**
   * Al entrar a modo rostro se resetean los guards y arranca el reloj de
   * "no reconocido": si nadie coincide en FACE_NO_MATCH_TIMEOUT_MS, se
   * vuelve al selector sugiriendo el código en vez de seguir intentando
   * indefinidamente (y de paso gastando peticiones de red sin parar).
   */
  useEffect(() => {
    if (screen !== "FACE") return;
    faceDoneRef.current = false;
    faceBusyRef.current = false;
    setFaceQuality("NO_FACE");
    setFaceMessage(null);

    faceTimeoutRef.current = setTimeout(() => {
      if (faceDoneRef.current) return;
      setScreen("KEYPAD");
      setFaceMessage("Rostro no reconocido. Utiliza tu código de asistencia.");
    }, FACE_NO_MATCH_TIMEOUT_MS);

    return () => {
      if (faceTimeoutRef.current) clearTimeout(faceTimeoutRef.current);
    };
  }, [screen]);

  useEffect(() => {
    if (!faceMessage) return;
    const timer = setTimeout(() => setFaceMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [faceMessage]);

  /**
   * A diferencia del código, el rostro nunca se encola offline: nadie
   * puede confirmar una coincidencia sin el servidor, así que un intento
   * sin conexión simplemente no hace nada (el usuario ve "Sin conexión"
   * en el encabezado y puede usar su código mientras tanto).
   */
  const attemptFaceMatch = useCallback(
    async (descriptor: number[]) => {
      if (faceBusyRef.current || faceDoneRef.current) return;
      faceBusyRef.current = true;
      const response = await registerAccessByFace(device.serverHost, device.apiToken, descriptor);
      faceBusyRef.current = false;
      if (faceDoneRef.current) return;

      if (response.status === "UNAUTHORIZED") {
        onRevoked();
        return;
      }
      if (response.status === "NETWORK_ERROR") {
        setConnection("OFFLINE");
        return;
      }
      if (response.outcome.kind === "FACE_NOT_RECOGNIZED") {
        return;
      }

      faceDoneRef.current = true;
      if (faceTimeoutRef.current) clearTimeout(faceTimeoutRef.current);
      setResult(response.outcome);
      setConnection("ONLINE");
      setLastSyncAt(new Date());
      setCountdown(RESULT_COUNTDOWN_SECONDS);
      setScreen("RESULT");
    },
    [device.serverHost, device.apiToken, onRevoked],
  );

  useEffect(() => {
    if (screen !== "FACE" || !modelsReady || cameraStatus !== "STREAMING") return;
    let cancelled = false;
    let busy = false;
    const interval = setInterval(() => {
      if (busy || cancelled || faceDoneRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      busy = true;
      // "always": mandamos el embedding aunque el rostro esté un poco
      // lejos/cerca; el servidor filtra por distancia.
      detectFace(video, { descriptorMode: "always" })
        .then((res) => {
          if (cancelled || faceDoneRef.current) return;
          setFaceQuality(res.quality);
          if (res.descriptor) {
            void attemptFaceMatch(res.descriptor);
          }
        })
        .finally(() => {
          busy = false;
        });
    }, FACE_DETECTION_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screen, modelsReady, cameraStatus, videoRef, attemptFaceMatch]);

  async function submitCode(code: string) {
    setScreen("LOADING");
    const response = await registerAccess(device.serverHost, device.apiToken, code);
    if (response.status === "OK") {
      setResult(response.outcome);
      setConnection("ONLINE");
      setLastSyncAt(new Date());
    } else if (response.status === "UNAUTHORIZED") {
      onRevoked();
      return;
    } else {
      enqueuePendingCode(code);
      setPendingCount(getPendingCount());
      setConnection("OFFLINE");
      setResult({ kind: "QUEUED_OFFLINE" });
    }
    setCountdown(RESULT_COUNTDOWN_SECONDS);
    setScreen("RESULT");
  }

  function handleDigit(digit: string) {
    if (screen !== "KEYPAD" || digits.length >= 6) return;
    const next = digits + digit;
    setDigits(next);
    if (next.length === 6) void submitCode(next);
  }

  function handleBackspace() {
    if (screen !== "KEYPAD") return;
    setDigits((prev) => prev.slice(0, -1));
  }

  function startLongPress() {
    longPressTimer.current = setTimeout(() => setSettingsOpen(true), LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  async function handleUnlink() {
    await forgetStoredDevice();
    onUnlinked();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-primary/95 via-primary/85 to-accent/80 px-6 py-10 text-primary-foreground">
      <header className="flex w-full max-w-md items-center justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">{device.gymName || "ASTRIM GYM"}</p>
          <p className="text-sm text-primary-foreground/70">Control de acceso</p>
        </div>
        <ConnectionBadge connection={connection} />
      </header>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {(screen === "KEYPAD" || screen === "FACE") && (
          <div className="mb-6 flex gap-1 rounded-full bg-primary-foreground/10 p-1">
            <button
              type="button"
              onClick={() => setScreen("KEYPAD")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                screen === "KEYPAD" ? "bg-primary-foreground text-primary" : "text-primary-foreground/70"
              }`}
            >
              <Keyboard className="h-4 w-4" />
              Código
            </button>
            <button
              type="button"
              onClick={() => connection === "ONLINE" && setScreen("FACE")}
              disabled={connection !== "ONLINE"}
              title={connection !== "ONLINE" ? "Requiere conexión" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                screen === "FACE" ? "bg-primary-foreground text-primary" : "text-primary-foreground/70"
              }`}
            >
              <ScanFace className="h-4 w-4" />
              Reconocimiento facial
            </button>
          </div>
        )}

        {faceMessage && screen === "KEYPAD" && (
          <p className="mb-4 max-w-xs text-center text-sm text-warning">{faceMessage}</p>
        )}

        {screen === "KEYPAD" && (
          <div className="flex flex-col items-center gap-8">
            <p className="text-center text-sm text-primary-foreground/70">
              Ingresa tu código de asistencia
            </p>
            <NumericKeypad digits={digits} length={6} onDigit={handleDigit} onBackspace={handleBackspace} />
          </div>
        )}

        {screen === "FACE" && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative aspect-square w-64 overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full -scale-x-100 object-cover"
              />
              <div
                className={`pointer-events-none absolute inset-6 rounded-full border-4 ${
                  faceQuality === "GOOD" ? "border-success" : "border-white/50"
                }`}
              />
            </div>
            <p className={`text-sm font-medium ${faceQuality === "GOOD" ? "text-success" : "text-primary-foreground/70"}`}>
              {!modelsReady || cameraStatus === "REQUESTING_PERMISSION"
                ? "Preparando cámara..."
                : cameraStatus === "PERMISSION_DENIED"
                  ? "Se necesita permiso de cámara para continuar."
                  : cameraStatus === "CAMERA_ERROR"
                    ? "No se pudo acceder a la cámara."
                    : FACE_QUALITY_MESSAGES[faceQuality]}
            </p>
          </div>
        )}

        {screen === "LOADING" && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-foreground/30 border-t-primary-foreground" />
            <p className="text-primary-foreground/80">Verificando...</p>
          </div>
        )}

        {screen === "RESULT" && result && (
          <div className="flex flex-col items-center gap-6">
            <ResultBanner result={result} />
            <p className="text-sm text-primary-foreground/60">Volviendo al inicio en {countdown}...</p>
          </div>
        )}
      </div>

      <footer className="flex w-full max-w-md flex-col items-center gap-2 text-xs text-primary-foreground/60">
        <div
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          className="flex flex-col items-center gap-1 rounded-lg px-4 py-2"
        >
          <span>{device.deviceName}</span>
          {lastSyncAt && <span>Última sincronización: {lastSyncAt.toLocaleTimeString("es-CO")}</span>}
          {pendingCount > 0 && <span>{pendingCount} código(s) pendiente(s) de sincronizar</span>}
        </div>
      </footer>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 text-foreground">
            <h2 className="text-lg font-semibold">Configuración del dispositivo</h2>
            <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Gimnasio: {device.gymName}</p>
              <p>Dispositivo: {device.deviceName}</p>
              <p>Servidor: {device.serverHost}</p>
              <p>Versión: 1.0.0</p>
            </div>
            {!confirmUnlink ? (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-lg bg-muted px-4 py-2 text-sm"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnlink(true)}
                  className="rounded-lg bg-danger px-4 py-2 text-sm text-white"
                >
                  Olvidar este dispositivo
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-sm text-danger">
                  Este dispositivo dejará de funcionar hasta que lo vincules de nuevo con un código
                  nuevo.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmUnlink(false)}
                    className="rounded-lg bg-muted px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="rounded-lg bg-danger px-4 py-2 text-sm text-white"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({ connection }: { connection: ConnectionStatus }) {
  if (connection === "ONLINE") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-success">
        <Wifi className="h-4 w-4" /> Conectado
      </span>
    );
  }
  if (connection === "SYNCING") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-warning">
        <Wifi className="h-4 w-4" /> Sincronizando
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-danger">
      <WifiOff className="h-4 w-4" /> Sin conexión
    </span>
  );
}

function ResultBanner({ result }: { result: ResultState }) {
  if (result.kind === "ERROR") {
    return (
      <Banner
        icon={<ShieldAlert className="h-16 w-16" />}
        tone="text-danger"
        title="No se pudo procesar"
        subtitle="Intenta de nuevo."
      />
    );
  }
  if (result.kind === "QUEUED_OFFLINE") {
    return (
      <Banner
        icon={<ShieldAlert className="h-16 w-16" />}
        tone="text-warning"
        title="SIN CONEXIÓN"
        subtitle="Tu código quedó guardado y se enviará solo apenas vuelva la conexión."
      />
    );
  }
  switch (result.kind) {
    case "ENTRY_ALLOWED":
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <ResultPhoto photoBase64={result.photoBase64} ringClassName="ring-success" />
          <ShieldCheck className="h-8 w-8 text-success" />
          <h2 className="text-2xl font-bold tracking-tight">✅ BIENVENIDO, {result.clientName}</h2>
          <p className="text-lg font-semibold text-primary-foreground/90">Entrada registrada</p>
          <p className="text-primary-foreground/70">Hora: {result.time}</p>
        </div>
      );
    case "EXIT_ALLOWED": {
      const hours = result.durationMinutes !== null ? Math.floor(result.durationMinutes / 60) : null;
      const minutes = result.durationMinutes !== null ? result.durationMinutes % 60 : null;
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <ResultPhoto photoBase64={result.photoBase64} ringClassName="ring-primary-foreground/40" />
          <LogIn className="h-8 w-8 rotate-180 text-primary-foreground" />
          <h2 className="text-2xl font-bold tracking-tight">✅ GRACIAS, {result.clientName}</h2>
          <p className="text-lg font-semibold text-primary-foreground/90">¡Esperamos verte pronto!</p>
          <p className="text-primary-foreground/70">Salida registrada</p>
          <p className="text-primary-foreground/70">Hora: {result.time}</p>
          {hours !== null && minutes !== null && (
            <p className="text-primary-foreground/70">
              Tiempo en el gimnasio: {hours} h {minutes} min
            </p>
          )}
        </div>
      );
    }
    case "DUPLICATE_IGNORED":
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <ResultPhoto photoBase64={result.photoBase64} ringClassName="ring-warning" />
          <ShieldAlert className="h-8 w-8 text-warning" />
          <h2 className="text-2xl font-bold tracking-tight">Ya registrado</h2>
          <p className="text-primary-foreground/90">
            {result.clientName}, tu entrada ya quedó registrada hace un momento.
          </p>
        </div>
      );
    case "FACE_NOT_RECOGNIZED":
      return (
        <Banner
          icon={<ShieldAlert className="h-16 w-16" />}
          tone="text-warning"
          title="Rostro no reconocido"
          subtitle="Utiliza tu código de asistencia."
        />
      );
    case "DENIED_CODE_NOT_FOUND":
      return (
        <Banner
          icon={<ShieldX className="h-16 w-16" />}
          tone="text-danger"
          title="ACCESO DENEGADO"
          subtitle="Código no válido."
        />
      );
    case "DENIED_CLIENT_INACTIVE":
      return (
        <Banner
          icon={<ShieldX className="h-16 w-16" />}
          tone="text-danger"
          title="ACCESO DENEGADO"
          subtitle="Este usuario no está habilitado. Acércate a recepción."
        />
      );
    case "DENIED_MEMBERSHIP_INVALID":
      return (
        <Banner
          icon={<ShieldX className="h-16 w-16" />}
          tone="text-danger"
          title="ACCESO DENEGADO"
          subtitle="Tu membresía no está vigente. Acércate a recepción."
        />
      );
  }
}

function ResultPhoto({ photoBase64, ringClassName }: { photoBase64: string | null; ringClassName: string }) {
  if (!photoBase64) return null;
  return (
    <img
      src={`data:image/jpeg;base64,${photoBase64}`}
      alt=""
      className={`h-40 w-40 rounded-full object-cover ring-4 ${ringClassName}`}
    />
  );
}

function Banner({
  icon,
  tone,
  title,
  subtitle,
  detail,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  subtitle: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className={tone}>{icon}</div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-primary-foreground/90">{subtitle}</p>
      {detail && <p className="text-sm text-primary-foreground/70">{detail}</p>}
    </div>
  );
}
