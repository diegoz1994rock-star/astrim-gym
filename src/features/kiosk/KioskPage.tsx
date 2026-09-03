import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Delete, LogIn, ShieldAlert, ShieldCheck, ShieldX, Wifi, WifiOff } from "lucide-react";
import * as gymRepository from "@/lib/repositories/gymRepository";
import { registerAccessEvent, type AccessOutcome } from "@/lib/services/accessService";
import type { MembershipStatus } from "@/lib/domain/membershipStatus";
import { cn } from "@/lib/utils";

const MEMBERSHIP_STATUS_DENIAL_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "activa",
  EXPIRING_SOON: "próxima a vencer",
  EXPIRED: "vencida",
  SUSPENDED: "suspendida",
  CANCELLED: "cancelada",
};

const DEVICE_ID_STORAGE_KEY = "astrim_kiosk_device_id";
const DEFAULT_DEVICE_ID = "RECEPCION-01";
const RESULT_COUNTDOWN_SECONDS = 5;

function getStoredDeviceId(): string {
  return localStorage.getItem(DEVICE_ID_STORAGE_KEY) ?? DEFAULT_DEVICE_ID;
}

type KioskScreen = "KEYPAD" | "LOADING" | "RESULT";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function KioskPage() {
  const navigate = useNavigate();
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string>("");
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const [digits, setDigits] = useState("");
  const [screen, setScreen] = useState<KioskScreen>("KEYPAD");
  const [result, setResult] = useState<AccessOutcome | "ERROR" | null>(null);
  const [countdown, setCountdown] = useState(RESULT_COUNTDOWN_SECONDS);
  const [deviceId, setDeviceId] = useState(getStoredDeviceId());
  const [editingDevice, setEditingDevice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    gymRepository
      .getSoleGymId()
      .then(async (id) => {
        if (cancelled) return;
        setGymId(id);
        setConnectionOk(id !== null);
        if (id) {
          const gym = await gymRepository.findGymById(id);
          if (!cancelled) setGymName(gym?.name ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setConnectionOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitCode = useCallback(
    async (code: string) => {
      if (!gymId) return;
      setScreen("LOADING");
      try {
        const outcome = await registerAccessEvent(gymId, code, deviceId || null);
        setResult(outcome);
      } catch {
        setResult("ERROR");
      } finally {
        setScreen("RESULT");
        setCountdown(RESULT_COUNTDOWN_SECONDS);
        setDigits("");
      }
    },
    [gymId, deviceId],
  );

  useEffect(() => {
    if (digits.length === 6) {
      submitCode(digits);
    }
  }, [digits, submitCode]);

  useEffect(() => {
    if (screen !== "RESULT") return;
    if (countdown <= 0) {
      setScreen("KEYPAD");
      setResult(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  function pressDigit(digit: string) {
    if (screen !== "KEYPAD" || digits.length >= 6) return;
    setDigits((prev) => prev + digit);
  }

  function pressBackspace() {
    if (screen !== "KEYPAD") return;
    setDigits((prev) => prev.slice(0, -1));
  }

  function saveDeviceId(value: string) {
    const next = value.trim() || DEFAULT_DEVICE_ID;
    setDeviceId(next);
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    setEditingDevice(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-primary/95 via-primary/85 to-accent/80 px-6 py-10 text-primary-foreground">
      <header className="flex w-full max-w-md items-center justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">{gymName || "ASTRIM GYM"}</p>
          <p className="text-sm text-primary-foreground/70">Control de acceso</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
          {connectionOk ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {connectionOk === false && <span>Sin conexión a la base de datos</span>}
        </div>
      </header>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
        {screen === "KEYPAD" && (
          <div className="flex flex-col items-center gap-8">
            <div>
              <p className="text-center text-sm text-primary-foreground/70">
                Ingresa tu código de asistencia
              </p>
              <div className="mt-4 flex justify-center gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "flex h-12 w-9 items-center justify-center rounded-lg border-2 text-2xl font-semibold",
                      index < digits.length
                        ? "border-primary-foreground bg-primary-foreground/15"
                        : "border-primary-foreground/30",
                    )}
                  >
                    {index < digits.length ? "●" : ""}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => pressDigit(key)}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/10 text-2xl font-semibold transition-colors hover:bg-primary-foreground/20 active:bg-primary-foreground/30"
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={pressBackspace}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/5 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/20"
              >
                <Delete className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => pressDigit("0")}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/10 text-2xl font-semibold transition-colors hover:bg-primary-foreground/20 active:bg-primary-foreground/30"
              >
                0
              </button>
              <div className="h-16 w-16" />
            </div>
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
            <ResultScreen result={result} />
            <p className="text-sm text-primary-foreground/60">Volviendo al inicio en {countdown}...</p>
          </div>
        )}
      </div>

      <footer className="flex w-full max-w-md items-center justify-between text-xs text-primary-foreground/60">
        {editingDevice ? (
          <input
            autoFocus
            defaultValue={deviceId}
            onBlur={(e) => saveDeviceId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDeviceId((e.target as HTMLInputElement).value);
            }}
            className="w-40 rounded border border-primary-foreground/30 bg-transparent px-2 py-1 text-primary-foreground"
          />
        ) : (
          <button type="button" onClick={() => setEditingDevice(true)}>
            Dispositivo: {deviceId}
          </button>
        )}
        <button type="button" onClick={() => navigate("/")}>
          Salir del modo recepción
        </button>
      </footer>
    </div>
  );
}

function ResultScreen({ result }: { result: AccessOutcome | "ERROR" }) {
  if (result === "ERROR") {
    return (
      <ResultBanner
        tone="danger"
        icon={<ShieldAlert className="h-16 w-16" />}
        title="No se pudo procesar"
        subtitle="Intenta de nuevo o avisa en recepción."
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
        <ResultBanner
          tone="warning"
          icon={<ShieldAlert className="h-16 w-16" />}
          title="Ya registrado"
          subtitle={`${result.clientName}, tu entrada ya quedó registrada hace un momento.`}
        />
      );
    case "DENIED_CODE_NOT_FOUND":
      return (
        <ResultBanner
          tone="danger"
          icon={<ShieldX className="h-16 w-16" />}
          title="ACCESO DENEGADO"
          subtitle="Código no válido."
        />
      );
    case "DENIED_CLIENT_INACTIVE":
      return (
        <ResultBanner
          tone="danger"
          icon={<ShieldX className="h-16 w-16" />}
          title="ACCESO DENEGADO"
          subtitle="Este usuario no está habilitado. Acércate a recepción."
        />
      );
    case "DENIED_MEMBERSHIP_INVALID":
      return (
        <ResultBanner
          tone="danger"
          icon={<ShieldX className="h-16 w-16" />}
          title="ACCESO DENEGADO"
          subtitle={
            result.membershipStatus
              ? `Membresía ${MEMBERSHIP_STATUS_DENIAL_LABELS[result.membershipStatus]}. Acércate a recepción.`
              : "No tienes una membresía registrada. Acércate a recepción."
          }
        />
      );
  }
}

function ResultBanner({
  tone,
  icon,
  title,
  subtitle,
  detail,
}: {
  tone: "success" | "danger" | "warning" | "primary";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail?: string;
}) {
  const toneClass = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    primary: "text-primary-foreground",
  }[tone];

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className={toneClass}>{icon}</div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-primary-foreground/90">{subtitle}</p>
      {detail && <p className="text-sm text-primary-foreground/70">{detail}</p>}
    </div>
  );
}
