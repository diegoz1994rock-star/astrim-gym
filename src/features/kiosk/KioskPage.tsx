import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Delete,
  Keyboard,
  LogIn,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as gymRepository from "@/lib/repositories/gymRepository";
import * as clientService from "@/lib/services/clientService";
import { registerAccessEvent, registerAccessEventByFace, type AccessOutcome } from "@/lib/services/accessService";
import { findBestMatch, type EnrolledFace } from "@/lib/domain/faceMatching";
import type { MembershipStatus } from "@/lib/domain/membershipStatus";
import { playKioskSound, preloadKioskSounds } from "@/lib/kioskSound";
import { cn } from "@/lib/utils";

/** Acceso concedido/registrado -> sonido positivo; el resto -> error. */
function isPositiveOutcome(r: AccessOutcome | "ERROR"): boolean {
  return r === "ERROR"
    ? false
    : r.kind === "ENTRY_ALLOWED" || r.kind === "EXIT_ALLOWED" || r.kind === "DUPLICATE_IGNORED";
}
import { Avatar } from "@/components/Avatar";
import { FaceCaptureModal } from "@/components/FaceCaptureModal";

const MEMBERSHIP_STATUS_DENIAL_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "activa",
  EXPIRING_SOON: "próxima a vencer",
  EXPIRED: "vencida",
  SUSPENDED: "suspendida",
  CANCELLED: "cancelada",
};

const DEVICE_ID_STORAGE_KEY = "astrim_kiosk_device_id";
const KIOSK_GYM_STORAGE_KEY = "astrim_kiosk_gym_id";
const DEFAULT_DEVICE_ID = "RECEPCION-01";
const RESULT_COUNTDOWN_SECONDS = 5;

function getStoredDeviceId(): string {
  return localStorage.getItem(DEVICE_ID_STORAGE_KEY) ?? DEFAULT_DEVICE_ID;
}

type KioskScreen = "KEYPAD" | "FACE" | "LOADING" | "RESULT";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
/** Tiempo máximo intentando reconocer antes de sugerir el código. */
const FACE_NO_MATCH_TIMEOUT_MS = 20000;

export function KioskPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionGymId = user?.gymId ?? null;
  const [gymId, setGymId] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string>("");
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const [digits, setDigits] = useState("");
  const [screen, setScreen] = useState<KioskScreen>("KEYPAD");
  const [result, setResult] = useState<AccessOutcome | "ERROR" | null>(null);
  const [countdown, setCountdown] = useState(RESULT_COUNTDOWN_SECONDS);
  const [deviceId, setDeviceId] = useState(getStoredDeviceId());
  const [editingDevice, setEditingDevice] = useState(false);
  const [enrolledFaces, setEnrolledFaces] = useState<EnrolledFace[]>([]);
  const [faceMessage, setFaceMessage] = useState<string | null>(null);
  const faceMatchedRef = useRef(false);
  const faceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El modo recepción se abre desde el panel ya con sesión: el gimnasio es el
  // del dueño logueado, y lo memorizamos para que sobreviva a recargas de la
  // tablet. `getSoleGymId()` (LIMIT 1) es solo el último respaldo: si la base
  // local tuviera más de un gimnasio tomaría uno al azar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (sessionGymId) {
          try {
            localStorage.setItem(KIOSK_GYM_STORAGE_KEY, sessionGymId);
          } catch {
            /* almacenamiento no disponible: se resuelve igual en memoria */
          }
        }
        const stored = (() => {
          try {
            return localStorage.getItem(KIOSK_GYM_STORAGE_KEY);
          } catch {
            return null;
          }
        })();
        const id = sessionGymId ?? stored ?? (await gymRepository.getSoleGymId());
        if (cancelled) return;
        setGymId(id);
        setConnectionOk(id !== null);
        if (id) {
          const gym = await gymRepository.findGymById(id);
          if (!cancelled) setGymName(gym?.name ?? "");
        }
      } catch {
        if (!cancelled) setConnectionOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionGymId]);

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

  /**
   * Carga (una vez por entrada al modo) el set completo de rostros
   * enrolados del gimnasio, para comparar cada frame en memoria — no hay
   * forma de comparar embeddings con SQL. Si nadie coincide en
   * FACE_NO_MATCH_TIMEOUT_MS, se sugiere el código en vez de seguir
   * intentando indefinidamente.
   */
  useEffect(() => {
    if (screen !== "FACE" || !gymId) return;
    let cancelled = false;
    faceMatchedRef.current = false;
    setFaceMessage(null);

    clientService.getClientsWithFaceEmbeddings(gymId).then((rows) => {
      if (cancelled) return;
      setEnrolledFaces(
        rows.map((row) => ({ clientId: row.id, embedding: JSON.parse(row.face_embedding) as number[] })),
      );
    });

    faceTimeoutRef.current = setTimeout(() => {
      if (cancelled || faceMatchedRef.current) return;
      setScreen("KEYPAD");
      setFaceMessage("Rostro no reconocido. Utiliza tu código de asistencia.");
    }, FACE_NO_MATCH_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (faceTimeoutRef.current) clearTimeout(faceTimeoutRef.current);
    };
  }, [screen, gymId]);

  useEffect(() => {
    if (!faceMessage) return;
    const timer = setTimeout(() => setFaceMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [faceMessage]);

  const handleFaceFrame = useCallback(
    (descriptor: number[]) => {
      if (faceMatchedRef.current || !gymId) return;
      const match = findBestMatch(descriptor, enrolledFaces);
      if (!match) return;

      faceMatchedRef.current = true;
      if (faceTimeoutRef.current) clearTimeout(faceTimeoutRef.current);
      setScreen("LOADING");
      registerAccessEventByFace(gymId, match.clientId, deviceId || null)
        .then((outcome) => setResult(outcome))
        .catch(() => setResult("ERROR"))
        .finally(() => {
          setScreen("RESULT");
          setCountdown(RESULT_COUNTDOWN_SECONDS);
        });
    },
    [gymId, enrolledFaces, deviceId],
  );

  useEffect(() => {
    preloadKioskSounds();
  }, []);

  // Sonido al mostrar el resultado del registro.
  useEffect(() => {
    if (screen !== "RESULT" || result === null) return;
    playKioskSound(isPositiveOutcome(result) ? "ok" : "denied");
  }, [screen, result]);

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
        {(screen === "KEYPAD" || screen === "FACE") && (
          <div className="mb-6 flex gap-1 rounded-full bg-primary-foreground/10 p-1">
            <button
              type="button"
              onClick={() => setScreen("KEYPAD")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                screen === "KEYPAD" ? "bg-primary-foreground text-primary" : "text-primary-foreground/70",
              )}
            >
              <Keyboard className="h-4 w-4" />
              Código
            </button>
            <button
              type="button"
              onClick={() => setScreen("FACE")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                screen === "FACE" ? "bg-primary-foreground text-primary" : "text-primary-foreground/70",
              )}
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

        {screen === "FACE" && (
          <p className="text-center text-sm text-primary-foreground/70">
            Mira a la cámara para registrar tu entrada o salida
          </p>
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

      <FaceCaptureModal
        open={screen === "FACE"}
        mode="RECOGNIZE"
        title="Reconocimiento facial"
        onClose={() => setScreen("KEYPAD")}
        onFrameDescriptor={handleFaceFrame}
      />
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
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar name={result.clientName} photoPath={result.photoPath} className="h-48 w-48 text-6xl ring-4 ring-success" />
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
          <Avatar
            name={result.clientName}
            photoPath={result.photoPath}
            className="h-48 w-48 text-6xl ring-4 ring-primary-foreground/40"
          />
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
          <Avatar
            name={result.clientName}
            photoPath={result.photoPath}
            className="h-32 w-32 text-4xl ring-4 ring-warning"
          />
          <ShieldAlert className="h-8 w-8 text-warning" />
          <h2 className="text-2xl font-bold tracking-tight">Ya registrado</h2>
          <p className="text-primary-foreground/90">
            {result.clientName}, tu entrada ya quedó registrada hace un momento.
          </p>
        </div>
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
