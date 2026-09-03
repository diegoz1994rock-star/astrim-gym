import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import * as deviceService from "@/lib/services/deviceService";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/types/device";

interface AddDeviceModalProps {
  open: boolean;
  gymId: string;
  onClose: () => void;
  onDeviceCreated: () => void;
}

function secondsUntil(isoLikeUtc: string): number {
  const target = new Date(`${isoLikeUtc.replace(" ", "T")}Z`).getTime();
  return Math.max(0, Math.round((target - Date.now()) / 1000));
}

export function AddDeviceModal({ open, gymId, onClose, onDeviceCreated }: AddDeviceModalProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>("RECEPTION_TABLET");
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ deviceId: string; code: string; expiresAt: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (open) {
      setDeviceType("RECEPTION_TABLET");
      setName("");
      setError(null);
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (!result) return;
    setSecondsLeft(secondsUntil(result.expiresAt));
    const interval = setInterval(() => setSecondsLeft(secondsUntil(result.expiresAt)), 1000);
    return () => clearInterval(interval);
  }, [result]);

  async function handleGenerate() {
    if (!name.trim()) {
      setError("Ingresa un nombre para el dispositivo.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const generated = await deviceService.generateDeviceAndCode(gymId, name, deviceType);
      setResult(generated);
      onDeviceCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el código.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCancelCode() {
    if (!result) return;
    setCancelling(true);
    try {
      await deviceService.cancelPairingCode(gymId, result.deviceId);
      onDeviceCreated();
      onClose();
    } finally {
      setCancelling(false);
    }
  }

  function formatCountdown(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar dispositivo"
      widthClassName="max-w-sm"
    >
      {!result ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo</label>
            <Select value={deviceType} onChange={(e) => setDeviceType(e.target.value as DeviceType)}>
              {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nombre</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Recepción principal"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Generar código
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Código de vinculación
          </p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground">
              {result.code}
            </p>
            <button
              type="button"
              title="Copiar"
              onClick={() => navigator.clipboard.writeText(result.code)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {secondsLeft > 0
              ? `Este código expira en ${formatCountdown(secondsLeft)}.`
              : "Este código ha expirado. Cierra y genera uno nuevo."}
          </p>
          <p className="text-sm text-muted-foreground">
            Introduce este código en la tablet de recepción.
          </p>
          <div className="flex w-full gap-2 pt-2">
            <Button variant="secondary" className="flex-1" disabled={cancelling} onClick={handleCancelCode}>
              Cancelar código
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Listo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
