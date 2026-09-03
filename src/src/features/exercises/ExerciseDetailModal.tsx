import { ExternalLink, VideoOff } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/StatusBadges";
import { resolveVideoEmbed } from "@/lib/domain/videoUrl";
import {
  EXERCISE_LEVEL_LABELS,
  EXERCISE_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  type ExerciseListItem,
} from "@/types/exercise";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface ExerciseDetailModalProps {
  open: boolean;
  exercise: ExerciseListItem | null;
  onClose: () => void;
}

export function ExerciseDetailModal({ open, exercise, onClose }: ExerciseDetailModalProps) {
  if (!exercise) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exercise.name}
      description={exercise.isGlobal ? "Ejercicio de la biblioteca global" : "Ejercicio del gimnasio"}
      widthClassName="max-w-lg"
    >
      <div className="mb-4 flex items-center gap-2">
        <ActiveStatusBadge status={exercise.status} />
        {exercise.isGlobal && <Badge tone="primary">Global</Badge>}
      </div>

      {exercise.description && (
        <p className="mb-4 text-sm text-muted-foreground">{exercise.description}</p>
      )}

      <InfoRow label="Categoría" value={exercise.category || "—"} />
      <InfoRow label="Grupo muscular" value={exercise.muscleGroup ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : "—"} />
      <InfoRow label="Músculos secundarios" value={exercise.secondaryMuscles || "—"} />
      <InfoRow label="Tipo de ejercicio" value={exercise.exerciseType ? EXERCISE_TYPE_LABELS[exercise.exerciseType] : "—"} />
      <InfoRow label="Nivel" value={exercise.level ? EXERCISE_LEVEL_LABELS[exercise.level] : "—"} />
      <InfoRow label="Equipamiento" value={exercise.equipment || "—"} />

      {exercise.instructions && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-1 text-sm font-medium text-foreground">Instrucciones</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{exercise.instructions}</p>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-sm font-medium text-foreground">Video de demostración</p>
        {exercise.videoPath ? (
          <ExerciseVideo url={exercise.videoPath} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <VideoOff className="h-4 w-4" />
            No hay video configurado para este ejercicio.
          </p>
        )}
      </div>
    </Modal>
  );
}

function ExerciseVideo({ url }: { url: string }) {
  const { kind, embedUrl } = resolveVideoEmbed(url);

  async function handleOpen() {
    try {
      await openUrl(url);
    } catch {
      // Si el sistema no puede abrir la URL (ej. formato inesperado), no
      // rompemos el detalle del ejercicio: simplemente no ocurre nada.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {kind === "youtube" && embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <iframe
            src={embedUrl}
            title="Video de demostración del ejercicio"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {kind === "direct" && embedUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={embedUrl} controls className="w-full rounded-lg border border-border" />
      )}

      <Button type="button" variant="secondary" size="sm" onClick={handleOpen} className="w-fit">
        <ExternalLink className="h-4 w-4" />
        Ver video
      </Button>
    </div>
  );
}
