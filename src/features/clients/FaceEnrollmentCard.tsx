import { useState } from "react";
import { ScanFace, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FaceCaptureModal } from "@/components/FaceCaptureModal";
import * as clientService from "@/lib/services/clientService";
import type { ClientListItem } from "@/types/client";

function formatEnrolledAt(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

interface FaceEnrollmentCardProps {
  gymId: string;
  client: ClientListItem;
  onChanged: () => void;
}

/**
 * Tarjeta independiente, igual que la de "Código de asistencia": el rostro
 * nunca se edita desde ClientFormModal, se gestiona aquí directamente
 * contra clientService.
 */
export function FaceEnrollmentCard({ gymId, client, onChanged }: FaceEnrollmentCardProps) {
  const [consent, setConsent] = useState(client.faceConsent);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const enrolled = client.faceEnrolledAt !== null;

  async function handleCaptured(descriptor: number[]) {
    setBusy(true);
    try {
      await clientService.enrollClientFace(gymId, client.id, descriptor, true);
      onChanged();
    } finally {
      setBusy(false);
      setCaptureOpen(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await clientService.removeClientFace(gymId, client.id);
      setConsent(false);
      onChanged();
    } finally {
      setBusy(false);
      setDeleteConfirmOpen(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconocimiento facial</CardTitle>
      </CardHeader>
      <CardContent>
        {enrolled ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ScanFace className="h-4 w-4 text-success" />
              <span className="font-medium text-foreground">✓ Rostro registrado</span>
              {client.faceEnrolledAt && (
                <span className="text-muted-foreground">— {formatEnrolledAt(client.faceEnrolledAt)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setCaptureOpen(true)}>
                <ScanFace className="h-4 w-4" />
                Actualizar reconocimiento
              </Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Eliminar reconocimiento
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Permite registrar entrada y salida reconociendo el rostro del cliente, como alternativa al
              código de asistencia. El rostro se procesa y se guarda únicamente en este dispositivo.
            </p>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong"
              />
              <span>
                El cliente autoriza el reconocimiento facial para el tratamiento de su dato biométrico
                con fines de identificación y control de asistencia.
              </span>
            </label>
            <div>
              <Button size="sm" disabled={!consent || busy} onClick={() => setCaptureOpen(true)}>
                <ScanFace className="h-4 w-4" />
                Añadir reconocimiento facial
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <FaceCaptureModal
        open={captureOpen}
        mode="ENROLL"
        title="Registrar rostro"
        onClose={() => setCaptureOpen(false)}
        onCaptured={handleCaptured}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Eliminar reconocimiento facial"
        description="Se borrará el registro biométrico de este cliente. Podrá seguir usando su código de asistencia con normalidad."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleRemove}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Card>
  );
}
