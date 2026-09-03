import { useEffect, useState, type FormEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/Avatar";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { validateTrainerForm, type TrainerValidationErrors } from "@/lib/domain/trainerValidation";
import { pickImageForCropping, saveOptimizedPhoto } from "@/lib/services/photoService";
import * as trainerService from "@/lib/services/trainerService";
import { TrainerValidationError } from "@/lib/services/trainerService";
import {
  emptyTrainerForm,
  trainerToFormInput,
  type TrainerFormInput,
  type TrainerListItem,
} from "@/types/trainer";

interface TrainerFormModalProps {
  open: boolean;
  gymId: string;
  trainer: TrainerListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function toFormInput(trainer: TrainerListItem | null): TrainerFormInput {
  return trainer ? trainerToFormInput(trainer) : emptyTrainerForm();
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function TrainerFormModal({ open, gymId, trainer, onClose, onSaved }: TrainerFormModalProps) {
  const [form, setForm] = useState<TrainerFormInput>(() => toFormInput(trainer));
  const [errors, setErrors] = useState<TrainerValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormInput(trainer));
      setErrors({});
      setFormError(null);
    }
  }, [open, trainer]);

  function update<K extends keyof TrainerFormInput>(key: K, value: TrainerFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePickPhoto() {
    // Igual que en Clientes: solo se elige el archivo fuente aquí. El
    // editor (marco 3:4, mover, zoom, rotar) produce el JPEG optimizado;
    // hasta confirmar "Recortar y guardar" la foto actual no cambia.
    const path = await pickImageForCropping();
    if (path) {
      setPendingImagePath(path);
      setCropperOpen(true);
    }
  }

  function handleCropperCancel() {
    setCropperOpen(false);
    setPendingImagePath(null);
  }

  async function handleCropperSave(blob: Blob) {
    const savedPath = await saveOptimizedPhoto(blob, `trainer_${trainer?.id ?? "new"}`);
    update("photoPath", savedPath);
    setCropperOpen(false);
    setPendingImagePath(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateTrainerForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (trainer) {
        await trainerService.updateTrainer(gymId, trainer.id, form);
      } else {
        await trainerService.createTrainer(gymId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof TrainerValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar el entrenador.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={trainer ? "Editar entrenador" : "Nuevo entrenador"}
      description={trainer ? trainer.name : "Completa los datos del nuevo entrenador."}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={form.name || "?"} photoPath={form.photoPath} className="h-16 w-16 text-lg" />
          <Button type="button" variant="secondary" size="sm" onClick={handlePickPhoto}>
            <Camera className="h-4 w-4" />
            {form.photoPath ? "Cambiar foto" : "Seleccionar foto"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre completo *
            </label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ej. Carlos Ruiz"
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Documento *</label>
            <Input value={form.document} onChange={(e) => update("document", e.target.value)} />
            <FieldError message={errors.document} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha de nacimiento
            </label>
            <Input
              type="date"
              value={form.birthDate ?? ""}
              onChange={(e) => update("birthDate", e.target.value || null)}
            />
            <FieldError message={errors.birthDate} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Teléfono</label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            <FieldError message={errors.phone} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Correo electrónico
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <FieldError message={errors.email} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Dirección</label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Especialidad</label>
            <Input
              value={form.specialty}
              onChange={(e) => update("specialty", e.target.value)}
              placeholder="Ej. Musculación"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha de ingreso
            </label>
            <Input
              type="date"
              value={form.joinDate ?? ""}
              onChange={(e) => update("joinDate", e.target.value || null)}
            />
            <FieldError message={errors.joinDate} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Descripción profesional
            </label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Formación, certificaciones, experiencia..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
            <Select
              value={form.status}
              onChange={(e) => update("status", e.target.value as TrainerFormInput["status"])}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Observaciones
            </label>
            <Textarea
              rows={3}
              value={form.observations}
              onChange={(e) => update("observations", e.target.value)}
            />
          </div>
        </div>

        {formError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar entrenador"
            )}
          </Button>
        </div>
      </form>
    </Modal>

    <ImageCropperModal
      open={cropperOpen}
      imagePath={pendingImagePath}
      aspectRatio={3 / 4}
      outputWidth={600}
      outputHeight={800}
      quality={0.82}
      onCancel={handleCropperCancel}
      onSave={handleCropperSave}
    />
    </>
  );
}
