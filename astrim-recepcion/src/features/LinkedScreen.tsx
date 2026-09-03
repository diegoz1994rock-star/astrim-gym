import { CheckCircle2 } from "lucide-react";
import type { StoredDevice } from "@/lib/deviceStorage";

export function LinkedScreen({ device, onContinue }: { device: StoredDevice; onContinue: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-primary/95 via-primary/85 to-accent/80 px-6 text-center text-primary-foreground">
      <CheckCircle2 className="h-20 w-20 text-success" />
      <h1 className="text-2xl font-bold tracking-tight">DISPOSITIVO VINCULADO</h1>
      <p className="text-lg">{device.gymName}</p>
      <p className="text-primary-foreground/80">{device.deviceName}</p>
      <p className="text-sm text-primary-foreground/60">Dispositivo autorizado</p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 rounded-full bg-primary-foreground/15 px-8 py-3 text-lg font-semibold hover:bg-primary-foreground/25"
      >
        CONTINUAR
      </button>
    </div>
  );
}
