import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RestoreSummaryText } from "@/components/RestoreSummaryText";

/** Aviso tras la restauración automática de una PC nueva. */
function AutoRestoreBanner() {
  const { autoRestore, dismissAutoRestore } = useAuth();
  if (!autoRestore) return null;
  const ok = autoRestore.errors.length === 0;
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        ok ? "border-success/25 bg-success-soft text-success" : "border-warning/25 bg-warning/10 text-foreground"
      }`}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-medium">
          {ok
            ? "Recuperamos tu gimnasio desde la nube."
            : "Recuperamos tu gimnasio desde la nube, con algunos avisos. Podés reintentar en Configuración → Nube."}
        </span>
        <RestoreSummaryText summary={autoRestore} />
      </div>
      <button type="button" aria-label="Cerrar" onClick={dismissAutoRestore} className="opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* min-w-0 es necesario para que este panel SÍ pueda encogerse por
          debajo del ancho de su contenido; sin esto flexbox lo mantiene tan
          ancho como el contenido interno y el contenido "se corta" en vez
          de ajustarse o hacer scroll. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <AutoRestoreBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
