import { useEffect, useState, type FormEvent } from "react";
import { Camera, Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/Avatar";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { cn } from "@/lib/utils";
import { validateClientForm, type ClientValidationErrors } from "@/lib/domain/clientValidation";
import { HEIGHT_CM_LIMITS, cmToMeters, metersToCm } from "@/lib/domain/validation";
import { pickImageForCropping, saveOptimizedPhoto } from "@/lib/services/photoService";
import * as clientService from "@/lib/services/clientService";
import { ClientValidationError } from "@/lib/services/clientService";
import {
  CLIENT_GENDER_LABELS,
  CLIENT_GOAL_LABELS,
  clientToFormInput,
  emptyClientForm,
  type ClientFormInput,
  type ClientListItem,
} from "@/types/client";
import type { TrainerOptionRow } from "@/types/db";

interface ClientFormModalProps {
  open: boolean;
  gymId: string;
  client: ClientListItem | null;
  trainers: TrainerOptionRow[];
  onClose: () => void;
  onSaved: () => void;
}

function toFormInput(client: ClientListItem | null): ClientFormInput {
  return client ? clientToFormInput(client) : emptyClientForm();
}

/**
 * El desplegable solo recibe entrenadores activos (trainerService.getActiveTrainerOptions).
 * Si el cliente ya tenía asignado un entrenador que luego fue desactivado, lo agregamos
 * igual a la lista (marcado como inactivo) para no perder ni ocultar esa asignación.
 */
function buildTrainerOptions(
  trainers: TrainerOptionRow[],
  client: ClientListItem | null,
): TrainerOptionRow[] {
  if (!client?.trainerId || trainers.some((t) => t.id === client.trainerId)) {
    return trainers;
  }
  return [...trainers, { id: client.trainerId, name: `${client.trainerName ?? "Entrenador"} (inactivo)` }];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function ClientFormModal({
  open,
  gymId,
  client,
  trainers,
  onClose,
  onSaved,
}: ClientFormModalProps) {
  const [form, setForm] = useState<ClientFormInput>(() => toFormInput(client));
  const [errors, setErrors] = useState<ClientValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormInput(client));
      setErrors({});
      setFormError(null);
    }
  }, [open, client]);

  const trainerOptions = buildTrainerOptions(trainers, client);

  function update<K extends keyof ClientFormInput>(key: K, value: ClientFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePickPhoto() {
    // Solo se elige el archivo fuente aquí: NO se guarda todavía. El editor
    // (marco 3:4, mover, zoom, rotar) decide qué queda y produce el JPEG
    // optimizado; hasta que el usuario confirme "Recortar y guardar", la
    // foto actual del cliente permanece intacta.
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
    const savedPath = await saveOptimizedPhoto(blob, `client_${client?.id ?? "new"}`);
    update("photoPath", savedPath);
    setCropperOpen(false);
    setPendingImagePath(null);
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    try {
      const code = await clientService.suggestAttendanceCode(gymId, client?.id);
      update("attendanceCode", code);
      setErrors((prev) => ({ ...prev, attendanceCode: undefined }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo generar el código.");
    } finally {
      setGeneratingCode(false);
    }
  }

  async function handleCopyCode() {
    if (!form.attendanceCode) return;
    await navigator.clipboard.writeText(form.attendanceCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateClientForm(form);
    if (fieldErrors.height) {
      // El límite real (0.3-2.5 m) no cambia; solo se expresa en cm, que es
      // la unidad que ve y escribe el usuario en este formulario.
      fieldErrors.height = `La altura debe estar entre ${HEIGHT_CM_LIMITS.min} y ${HEIGHT_CM_LIMITS.max} cm.`;
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (client) {
        await clientService.updateClient(gymId, client.id, form);
      } else {
        await clientService.createClient(gymId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ClientValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
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
      title={client ? "Editar cliente" : "Nuevo cliente"}
      description={client ? client.name : "Completa los datos del nuevo miembro."}
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

        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Datos personales
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre completo *
            </label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ej. Laura Martínez"
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">Género</label>
            <Select
              value={form.gender ?? ""}
              onChange={(e) => update("gender", (e.target.value || null) as ClientFormInput["gender"])}
            >
              <option value="">Sin especificar</option>
              {Object.entries(CLIENT_GENDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Objetivo deportivo
            </label>
            <Select
              value={form.goal ?? ""}
              onChange={(e) => update("goal", (e.target.value || null) as ClientFormInput["goal"])}
            >
              <option value="">Sin especificar</option>
              {Object.entries(CLIENT_GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Entrenador</label>
            <Select
              value={form.trainerId ?? ""}
              onChange={(e) => update("trainerId", e.target.value || null)}
            >
              <option value="">Sin asignar</option>
              {trainerOptions.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </option>
              ))}
            </Select>
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
            <Select
              value={form.status}
              onChange={(e) => update("status", e.target.value as ClientFormInput["status"])}
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

        <div className="border-t border-border pt-5">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground">
            Medidas corporales
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Representan las medidas actuales del cliente. Todas son opcionales; el historial de
            mediciones a través del tiempo se registra por separado en Progreso.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Peso (kg)</label>
              <Input
                type="number"
                step="0.1"
                value={form.weight ?? ""}
                onChange={(e) => update("weight", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.weight} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Altura (cm)</label>
              <Input
                type="number"
                step="1"
                value={form.height !== null ? metersToCm(form.height) : ""}
                onChange={(e) =>
                  update("height", e.target.value === "" ? null : cmToMeters(Number(e.target.value)))
                }
              />
              <FieldError message={errors.height} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Cintura (cm)</label>
              <Input
                type="number"
                step="0.1"
                value={form.waist ?? ""}
                onChange={(e) => update("waist", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.waist} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Pecho (cm)</label>
              <Input
                type="number"
                step="0.1"
                value={form.chest ?? ""}
                onChange={(e) => update("chest", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.chest} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Brazo (cm)</label>
              <Input
                type="number"
                step="0.1"
                value={form.arm ?? ""}
                onChange={(e) => update("arm", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.arm} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Muslo (cm)</label>
              <Input
                type="number"
                step="0.1"
                value={form.leg ?? ""}
                onChange={(e) => update("leg", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.leg} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Pantorrilla (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                value={form.calf ?? ""}
                onChange={(e) => update("calf", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.calf} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Cadera (cm)</label>
              <Input
                type="number"
                step="0.1"
                value={form.hip ?? ""}
                onChange={(e) => update("hip", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.hip} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Masa muscular (kg)
              </label>
              <Input
                type="number"
                step="0.1"
                value={form.muscleMass ?? ""}
                onChange={(e) =>
                  update("muscleMass", e.target.value === "" ? null : Number(e.target.value))
                }
              />
              <FieldError message={errors.muscleMass} />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground">
            Código de asistencia
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Código de 6 dígitos para registrar entrada y salida en la tablet de recepción. No es la
            contraseña de la cuenta del cliente: solo sirve para el control de acceso al gimnasio.
          </p>
          <div className="flex items-start gap-3">
            <div className="w-40">
              <Input
                value={form.attendanceCode ?? ""}
                onChange={(e) =>
                  update("attendanceCode", e.target.value.replace(/\D/g, "").slice(0, 6) || null)
                }
                placeholder="Ej. 475783"
                inputMode="numeric"
                maxLength={6}
                className="font-mono tracking-widest"
              />
              <FieldError message={errors.attendanceCode} />
            </div>
            <Button type="button" variant="secondary" disabled={generatingCode} onClick={handleGenerateCode}>
              {generatingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {form.attendanceCode ? "Generar nuevo" : "Generar"}
            </Button>
            {form.attendanceCode && (
              <Button type="button" variant="secondary" onClick={handleCopyCode}>
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {codeCopied ? "Código copiado" : "Copiar"}
              </Button>
            )}
          </div>
        </div>

        {formError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </div>
        )}

        <div className={cn("flex justify-end gap-3 border-t border-border pt-4")}>
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
              "Guardar cliente"
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
