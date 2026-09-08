import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCloudConfigured } from "@/lib/cloud/firebase";
import { createClientLogin } from "@/lib/cloud/clientAccountService";

interface ClientAppAccessCardProps {
  gymId: string;
  clientId: string;
  clientEmail: string | null;
  cloudUid: string | null;
  onCreated: () => void;
}

export function ClientAppAccessCard({
  gymId,
  clientId,
  clientEmail,
  cloudUid,
  onCreated,
}: ClientAppAccessCardProps) {
  const [email, setEmail] = useState(clientEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Ingresa un correo y una contraseña de al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await createClientLogin(gymId, clientId, email, password);
      setPassword("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el acceso.");
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
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Este cliente ya tiene acceso a la app.
          </p>
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
