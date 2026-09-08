import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthContext";
import { requestPasswordReset } from "@/lib/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResetMsg(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset() {
    setError(null);
    setResetMsg(null);
    setResetting(true);
    try {
      await requestPasswordReset(email);
      setResetMsg(
        `Si hay una cuenta con ${email.trim()}, te llegó un correo con un enlace para poner una contraseña nueva. Revisá también el spam.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Panel visual (fotografía del gimnasio) */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/login-background.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.32_0.09_264/0.88)] via-[oklch(0.28_0.07_255/0.78)] to-[oklch(0.4_0.06_210/0.62)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,oklch(1_0_0/0.14),transparent_46%)]" />

        <img
          src="/astrim-full-logo.png"
          alt="ASTRIM GYM"
          className="relative h-28 w-auto max-w-[75%] self-start object-contain object-left drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)]"
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md"
        >
          <h1 className="text-[2.6rem] font-semibold leading-[1.1] tracking-tight">
            Administra tu gimnasio con claridad total.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Clientes, membresías, pagos, rutinas y progreso en un solo panel,
            diseñado para crecer contigo.
          </p>
        </motion.div>

        <p className="relative text-sm text-white/55">
          © {new Date().getFullYear()} ASTRIM GYM — Panel administrativo
        </p>
      </div>

      {/* Panel de formulario */}
      <div className="relative flex items-center justify-center p-8">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <img
            src="/astrim-mark.png"
            alt="ASTRIM GYM"
            className="mx-auto mb-6 h-24 w-24 rounded-2xl object-cover shadow-lg ring-1 ring-white/10"
          />

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder al panel administrativo.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
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
              <label className="mb-1.5 block text-sm font-medium text-foreground">Contraseña</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-subtle transition-colors hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="mt-2 ml-auto block text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-60"
              >
                {resetting ? "Enviando…" : "¿Olvidaste tu contraseña?"}
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            {resetMsg && (
              <div className="flex items-start gap-2 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resetMsg}</span>
              </div>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? (
                <>
                  <Spinner />
                  Verificando…
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
