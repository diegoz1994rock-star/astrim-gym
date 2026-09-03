import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@astrimgym.demo");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex">
        {/* Fotografía provista por el gimnasio: cubre el panel completo,
            sin recortes destructivos (bg-cover conserva la proporción). */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/login-background.png)" }}
        />
        {/* Overlay sutil (misma paleta de marca que antes) solo para
            garantizar legibilidad del texto; la fotografía sigue siendo
            claramente visible debajo. */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/75 via-primary/60 to-accent/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%)]" />
        <div className="relative flex items-center gap-4">
          <img src="/astrim-icon.png" alt="" className="h-20 w-20 object-contain" />
          <img src="/astrim-wordmark.png" alt="ASTRIM GYM" className="h-12 w-auto object-contain" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md"
        >
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Administra tu gimnasio con claridad total.
          </h1>
          <p className="mt-4 text-primary-foreground/80">
            Clientes, membresías, pagos, rutinas y progreso en un solo panel,
            diseñado para crecer contigo.
          </p>
        </motion.div>

        <p className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} ASTRIM GYM — Panel administrativo
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/astrim-icon.png" alt="" className="h-14 w-14 object-contain" />
            <img src="/astrim-wordmark.png" alt="ASTRIM GYM" className="h-8 w-auto object-contain" />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder al panel administrativo.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-10"
                  placeholder="admin@tugimnasio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            Acceso de demostración: <strong>admin@astrimgym.demo</strong> / contraseña{" "}
            <strong>admin123</strong>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
