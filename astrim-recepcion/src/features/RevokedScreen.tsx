import { ShieldOff } from "lucide-react";

export function RevokedScreen({ onRelink }: { onRelink: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-danger/90 via-danger/70 to-primary/70 px-6 text-center text-primary-foreground">
      <ShieldOff className="h-20 w-20" />
      <h1 className="text-2xl font-bold tracking-tight">DISPOSITIVO NO AUTORIZADO</h1>
      <p className="max-w-xs text-primary-foreground/90">
        Este dispositivo ya no está vinculado a este gimnasio.
      </p>
      <p className="text-primary-foreground/80">Contacta al administrador.</p>
      <button
        type="button"
        onClick={onRelink}
        className="mt-4 rounded-full bg-primary-foreground/15 px-8 py-3 text-lg font-semibold hover:bg-primary-foreground/25"
      >
        VINCULAR NUEVAMENTE
      </button>
    </div>
  );
}
