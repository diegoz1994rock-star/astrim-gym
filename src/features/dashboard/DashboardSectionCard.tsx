import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSectionCardProps {
  title: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  skeletonHeight?: string;
}

/**
 * Wrapper único reutilizado por todos los widgets del Dashboard: cada uno
 * maneja loading/error/empty/success por su cuenta, así una métrica que
 * falla nunca rompe el resto de la página.
 */
export function DashboardSectionCard({
  title,
  loading,
  error,
  onRetry,
  isEmpty,
  emptyMessage,
  actions,
  children,
  className,
  skeletonHeight = "h-40",
}: DashboardSectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className={cn("animate-pulse rounded-md bg-muted", skeletonHeight)} />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <p>No se pudo cargar esta información.</p>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : isEmpty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyMessage ?? "Aún no hay datos suficientes."}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
