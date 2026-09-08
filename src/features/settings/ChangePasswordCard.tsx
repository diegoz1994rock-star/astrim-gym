import { useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as accountService from "@/lib/services/accountService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export function ChangePasswordCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShow(false);
    setError(null);
    setBusy(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!user?.email) {
      setError("No se pudo identificar tu cuenta.");
      return;
    }
    if (next !== confirm) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setBusy(true);
    try {
      await accountService.changePassword(user.email, current, next, user.gymId);
      close();
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceso al panel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Iniciás sesión con{" "}
          <span className="font-medium text-foreground">{user?.email ?? "—"}</span>. Podés
          cambiar tu contraseña por una más fácil de recordar; se actualiza al instante.
        </p>
        {done && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Contraseña actualizada.
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <KeyRound className="h-4 w-4" />
          Cambiar contraseña
        </Button>
      </CardContent>

      <Modal
        open={open}
        onClose={close}
        title="Cambiar contraseña"
        description="Se actualiza en la nube y en este equipo."
        widthClassName="max-w-sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Contraseña actual
            </label>
            <Input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nueva contraseña
            </label>
            <Input
              type={show ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Repetir nueva contraseña
            </label>
            <Input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong"
            />
            Mostrar contraseñas
          </label>

          {error && (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cambiando…
                </>
              ) : (
                "Cambiar"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
