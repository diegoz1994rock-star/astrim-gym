import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCloudConfigured } from "@/lib/cloud/firebase";
import {
  createClientLogin,
  readClientCredential,
  saveClientCredential,
} from "@/lib/cloud/clientAccountService";

interface ClientAppAccessCardProps {
  gymId: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  cloudUid: string | null;
  onCreated: () => void;
}

export function ClientAppAccessCard({
  gymId,
  clientId,
  clientName,
  clientEmail,
  cloudUid,
  onCreated,
}: ClientAppAccessCardProps) {
  const [email, setEmail] = useState(clientEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [savedCred, setSavedCred] = useState<{ email: string; password: string } | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const loadSavedCred = useCallback(() => {
    if (!cloudUid || !isCloudConfigured) {
      setSavedCred(null);
      return;
    }
    void readClientCredential(clientId).then(setSavedCred);
  }, [cloudUid, clientId]);

  useEffect(() => loadSavedCred(), [loadSavedCred]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Ingresa un correo y una contraseña de al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await createClientLogin(gymId, clientId, clientName, email, password);
      setPassword("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el acceso.");
    } finally {
      setBusy(false);
    }
  }

  // El acceso ya existe: solo se puede guardar/actualizar la contraseña de
  // recuperación (Firebase no deja leer la contraseña real de una cuenta).
  async function handleSaveRecovery(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSavedMsg(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await saveClientCredential(gymId, clientId, clientName, email || clientEmail || "", password);
      setPassword("");
      setSavedMsg("Contraseña guardada para recuperación.");
      loadSavedCred();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceso a la app de clientes</CardTitle>
      </CardHeader>
      <CardContent>
        {!isCloudConfigured ? (
          <p className="text-sm text-muted-foreground">
            Configura la nube (Configuración → Nube) para poder crear accesos a la app.
          </p>
        ) : cloudUid ? (
          <form onSubmit={handleSaveRecovery} className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Este cliente ya tiene acceso a la app.
            </p>

            {savedCred && (
              <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-xs font-medium text-muted-foreground">Datos de acceso guardados</span>
                <span className="text-foreground">
                  <span className="text-muted-foreground">Usuario: </span>
                  {savedCred.email || clientEmail || "—"}
                </span>
                <span className="flex items-center gap-2 text-foreground">
                  <span className="text-muted-foreground">Contraseña: </span>
                  <span className="font-mono">
                    {showSaved ? savedCred.password : "•".repeat(Math.min(savedCred.password.length, 12) || 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSaved((v) => !v)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={showSaved ? "Ocultar" : "Mostrar"}
                  >
                    {showSaved ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {savedCred
                ? "¿El cliente cambió su contraseña o querés ponerle una nueva? Escribila acá para actualizar los datos guardados."
                : "Si el cliente olvida su contraseña, escribí acá la contraseña actual (o ponele una nueva y comunicásela). Queda guardada para que vos o el operador de ASTRIM puedan recuperarla."}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="text"
                placeholder="Contraseña de recuperación (mín. 6)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={busy} className="w-fit">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar contraseña
              </Button>
            </div>
            {savedMsg && <p className="text-xs text-success">{savedMsg}</p>}
            {error && <p className="text-xs text-danger">{error}</p>}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Crea el usuario y contraseña con los que este cliente iniciará sesión en la app móvil.
              Podrás comunicárselos y él podrá cambiar la contraseña después.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Contraseña (mín. 6)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" size="sm" disabled={busy} className="w-fit">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Crear acceso
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
