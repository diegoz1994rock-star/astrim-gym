import { useEffect, useRef, useState } from "react";
import { LogIn, ShieldAlert, ShieldCheck, ShieldX, Wifi, WifiOff } from "lucide-react";
import { pingServer, registerAccess, type AccessOutcome } from "@/lib/lanClient";
import { enqueuePendingCode, getPendingCount, peekOldestPending, removePending } from "@/lib/offlineQueue";
import { forgetStoredDevice, type StoredDevice } from "@/lib/deviceStorage";
import { NumericKeypad } from "./NumericKeypad";

const PING_INTERVAL_MS = 10_000;
const QUEUE_FLUSH_INTERVAL_MS = 8_000;
const RESULT_COUNTDOWN_SECONDS = 5;
const LONG_PRESS_MS = 3_000;

type ConnectionStatus = "ONLINE" | "SYNCING" | "OFFLINE";
type Screen = "KEYPAD" | "LOADING" | "RESULT";
type ResultState = AccessOutcome | { kind: "QUEUED_OFFLINE" } | { kind: "ERROR" };

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
        {screen === "KEYPAD" && (
          <div className="flex flex-col items-center gap-8">
            <p className="text-center text-sm text-primary-foreground/70">
              Ingresa tu código de asistencia
            </p>
            <NumericKeypad digits={digits} length={6} onDigit={handleDigit} onBackspace={handleBackspace} />
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
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-16 w-16 text-success" />
          <h2 className="text-2xl font-bold tracking-tight">✅ BIENVENIDO, {result.clientName}</h2>
          <p className="text-lg font-semibold text-primary-foreground/90">Entrada registrada</p>
          <p className="text-primary-foreground/70">Hora: {result.time}</p>
        </div>
      );
    case "EXIT_ALLOWED": {
      const hours = result.durationMinutes !== null ? Math.floor(result.durationMinutes / 60) : null;
      const minutes = result.durationMinutes !== null ? result.durationMinutes % 60 : null;
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <LogIn className="h-16 w-16 rotate-180 text-primary-foreground" />
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
        <Banner
          icon={<ShieldAlert className="h-16 w-16" />}
          tone="text-warning"
          title="Ya registrado"
          subtitle={`${result.clientName}, tu entrada ya quedó registrada hace un momento.`}
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
