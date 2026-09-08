import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Evita que un error de render en cualquier pantalla deje la app en
 * blanco. Muestra un mensaje legible y un botón para recargar (la
 * sesión persiste, así que recargar vuelve a la misma pantalla).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en la UI:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Algo salió mal en esta pantalla</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Ocurrió un error inesperado. Podés recargar la aplicación; tu sesión se mantiene.
          </p>
        </div>
        <pre className="max-w-lg overflow-x-auto rounded-md border border-border bg-surface-muted px-3 py-2 text-left text-xs text-muted-foreground">
          {this.state.error.message}
        </pre>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    );
  }
}
