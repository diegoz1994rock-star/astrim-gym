import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as trainerService from "@/lib/services/trainerService";
import { formatDate } from "@/lib/format";
import type { TrainerListItem } from "@/types/trainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { ActiveStatusBadge } from "@/components/StatusBadges";
import { TrainerFormModal } from "./TrainerFormModal";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function TrainerProfilePage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState<TrainerListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const loadTrainer = useCallback(async () => {
    if (!gymId || !trainerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await trainerService.getTrainerById(gymId, trainerId);
      if (!data) setError("El entrenador no existe o fue eliminado.");
      setTrainer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el entrenador.");
    } finally {
      setLoading(false);
    }
  }, [gymId, trainerId]);

  useEffect(() => {
    loadTrainer();
  }, [loadTrainer]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando entrenador...</div>;
  }

  if (error || !trainer) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-danger">{error ?? "Entrenador no encontrado."}</p>
        <Button variant="secondary" onClick={() => navigate("/entrenadores")}>
          <ArrowLeft className="h-4 w-4" />
          Volver a Entrenadores
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/entrenadores")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Entrenadores
      </button>

      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={trainer.name} photoPath={trainer.photoPath} className="h-16 w-16 text-lg" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{trainer.name}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <ActiveStatusBadge status={trainer.status} />
                {trainer.specialty && (
                  <span className="text-sm text-muted-foreground">{trainer.specialty}</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar entrenador
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Edad" value={trainer.age !== null ? `${trainer.age} años` : "—"} />
            <InfoRow label="Documento" value={trainer.document ?? "—"} />
            <InfoRow label="Teléfono" value={trainer.phone ?? "—"} />
            <InfoRow label="Correo" value={trainer.email ?? "—"} />
            <InfoRow label="Dirección" value={trainer.address ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil profesional</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Especialidad" value={trainer.specialty ?? "—"} />
            <InfoRow label="Fecha de ingreso" value={formatDate(trainer.joinDate)} />
            <InfoRow label="Descripción" value={trainer.description || "—"} />
            <InfoRow label="Observaciones" value={trainer.observations || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {trainer.clientCount}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {trainer.clientCount === 1
                ? "cliente asignado actualmente"
                : "clientes asignados actualmente"}
            </p>
          </CardContent>
        </Card>
      </div>

      <TrainerFormModal
        open={editOpen}
        gymId={gymId ?? ""}
        trainer={trainer}
        onClose={() => setEditOpen(false)}
        onSaved={loadTrainer}
      />
    </div>
  );
}
