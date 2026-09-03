import { useEffect, useState } from "react";
import { discoverServerHost } from "@/lib/discovery";
import { pairWithServer, pingServer } from "@/lib/lanClient";
import { NumericKeypad } from "./NumericKeypad";
import type { StoredDevice } from "@/lib/deviceStorage";

interface PairingScreenProps {
  onLinked: (device: StoredDevice) => void;
}

type DiscoveryState = "SEARCHING" | "FOUND" | "NOT_FOUND";

export function PairingScreen({ onLinked }: PairingScreenProps) {
  const [digits, setDigits] = useState("");
  const [host, setHost] = useState<string | null>(null);
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>("SEARCHING");
  const [manualHost, setManualHost] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    discoverServerHost().then((found) => {
      if (cancelled) return;
      if (found) {
        setHost(found);
        setDiscoveryState("FOUND");
      } else {
        setDiscoveryState("NOT_FOUND");
        setShowManualInput(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function tryManualHost() {
    const trimmed = manualHost.trim();
    if (!trimmed) return;
    setError(null);
    const reachable = await pingServer(trimmed);
    if (reachable) {
      setHost(trimmed);
      setDiscoveryState("FOUND");
      setShowManualInput(false);
    } else {
      setError("No se pudo conectar a esa dirección IP. Verifica que estén en la misma red WiFi.");
    }
  }

  async function submitCode(code: string) {
    if (!host) {
      setError("Todavía no se encuentra el computador del gimnasio en la red.");
      setDigits("");
      return;
    }
    setLinking(true);
    setError(null);
    try {
      const result = await pairWithServer(host, code);
      onLinked({
        gymId: result.gymId,
        gymName: result.gymName,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        apiToken: result.apiToken,
        serverHost: host,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular el dispositivo.");
      setDigits("");
    } finally {
      setLinking(false);
    }
  }

  function handleDigit(digit: string) {
    if (linking || digits.length >= 6) return;
    const next = digits + digit;
    setDigits(next);
    if (next.length === 6) {
      void submitCode(next);
    }
  }

  function handleBackspace() {
    if (linking) return;
    setDigits((prev) => prev.slice(0, -1));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-primary/95 via-primary/85 to-accent/80 px-6 py-10 text-center text-primary-foreground">
      <div>
        <p className="text-2xl font-bold tracking-tight">ASTRIM GYM</p>
        <p className="text-lg text-primary-foreground/80">RECEPCIÓN</p>
      </div>

      <div className="max-w-xs">
        <p className="text-primary-foreground/90">Este dispositivo aún no está vinculado.</p>
        <p className="mt-1 text-sm text-primary-foreground/70">Código de vinculación</p>
      </div>

      <NumericKeypad digits={digits} length={6} disabled={linking} onDigit={handleDigit} onBackspace={handleBackspace} />

      <div className="flex min-h-[3rem] flex-col items-center gap-2 text-sm">
        {linking && <p className="text-primary-foreground/80">Vinculando...</p>}
        {!linking && discoveryState === "SEARCHING" && (
          <p className="text-primary-foreground/60">Buscando el computador del gimnasio en la red...</p>
        )}
        {!linking && discoveryState === "FOUND" && (
          <p className="text-primary-foreground/60">Conectado a {host}</p>
        )}
        {error && <p className="text-warning">{error}</p>}
        {!linking && showManualInput && (
          <div className="flex items-center gap-2">
            <input
              value={manualHost}
              onChange={(e) => setManualHost(e.target.value)}
              placeholder="IP del computador (ej. 192.168.1.23)"
              className="rounded-lg border border-primary-foreground/30 bg-transparent px-3 py-1.5 text-sm text-primary-foreground placeholder:text-primary-foreground/50"
            />
            <button
              type="button"
              onClick={tryManualHost}
              className="rounded-lg bg-primary-foreground/15 px-3 py-1.5 text-sm hover:bg-primary-foreground/25"
            >
              Conectar
            </button>
          </div>
        )}
        {!linking && discoveryState === "FOUND" && !showManualInput && (
          <button
            type="button"
            className="text-xs text-primary-foreground/50 underline"
            onClick={() => setShowManualInput(true)}
          >
            Ingresar IP manualmente
          </button>
        )}
      </div>
    </div>
  );
}
