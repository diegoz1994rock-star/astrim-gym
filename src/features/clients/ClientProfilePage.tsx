import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Eye, EyeOff, KeyRound, LineChart, Pencil, RotateCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as trainerService from "@/lib/services/trainerService";
import * as membershipService from "@/lib/services/membershipService";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeBmi, classifyBmi, BMI_CATEGORY_LABELS } from "@/lib/domain/bmi";
import { metersToCm } from "@/lib/domain/validation";
import { CLIENT_GENDER_LABELS, CLIENT_GOAL_LABELS, type ClientListItem } from "@/types/client";
import type { MembershipListItem } from "@/types/membership";
import type { TrainerOptionRow } from "@/types/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { ActiveStatusBadge, MembershipStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ClientFormModal } from "./ClientFormModal";
import { FaceEnrollmentCard } from "./FaceEnrollmentCard";
import { ClientAppAccessCard } from "./ClientAppAccessCard";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatMeasurement(value: number | null, unit: string): string {
  return value !== null ? `${value} ${unit}` : "Sin registrar";
}

export function ClientProfilePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientListItem | null>(null);
  const [trainers, setTrainers] = useState<TrainerOptionRow[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<MembershipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [codeConfirmOpen, setCodeConfirmOpen] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const loadClient = useCallback(async () => {
    if (!gymId || !clientId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientData, trainersData, historyData] = await Promise.all([
        clientService.getClientById(gymId, clientId),
        trainerService.getActiveTrainerOptions(gymId),
        membershipService.getMembershipsByClient(gymId, clientId),
      ]);
      if (!clientData) {
        setError("El cliente no existe o fue eliminado.");
      }
      setClient(clientData);
      setTrainers(trainersData);
      setMembershipHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el cliente.");
    } finally {
      setLoading(false);
    }
  }, [gymId, clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  async function handleGenerateOrRegenerateCode() {
    if (!gymId || !clientId) return;
    setCodeBusy(true);
    try {
      await clientService.generateClientAttendanceCode(gymId, clientId);
      setCodeRevealed(true);
      await loadClient();
    } finally {
      setCodeBusy(false);
      setCodeConfirmOpen(false);
    }
  }

  async function handleCopyCode() {
    if (!client?.attendanceCode) return;
    await navigator.clipboard.writeText(client.attendanceCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando cliente...</div>;
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-danger">{error ?? "Cliente no encontrado."}</p>
        <Button variant="secondary" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </Button>
      </div>
    );
  }

  const bmi = computeBmi(client.weight, client.height);
  const bmiCategory = classifyBmi(bmi);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/clientes")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Clientes
      </button>

      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} photoPath={client.photoPath} className="h-16 w-16 text-lg" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{client.name}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <ActiveStatusBadge status={client.status} />
                <MembershipStatusBadge status={client.membershipStatus} />
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar cliente
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Edad" value={client.age !== null ? `${client.age} años` : "—"} />
            <InfoRow label="Documento" value={client.document ?? "—"} />
            <InfoRow label="Teléfono" value={client.phone ?? "—"} />
            <InfoRow label="Correo" value={client.email ?? "—"} />
            <InfoRow label="Dirección" value={client.address ?? "—"} />
            <InfoRow label="Género" value={client.gender ? CLIENT_GENDER_LABELS[client.gender] : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrenamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Objetivo" value={client.goal ? CLIENT_GOAL_LABELS[client.goal] : "—"} />
            <InfoRow label="Entrenador" value={client.trainerName ?? "Sin asignar"} />
            <InfoRow label="Fecha de ingreso" value={formatDate(client.joinDate)} />
            <InfoRow label="Observaciones" value={client.observations || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membresía actual</CardTitle>
          </CardHeader>
          <CardContent>
            {client.membershipPlanName ? (
              <>
                <InfoRow label="Plan" value={client.membershipPlanName} />
                <InfoRow label="Inicio" value={formatDate(client.membershipStartDate)} />
                <InfoRow label="Vencimiento" value={formatDate(client.membershipEndDate)} />
                <InfoRow
                  label="Precio"
                  value={client.membershipPrice !== null ? formatCurrency(client.membershipPrice) : "—"}
                />
              </>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                Este cliente aún no tiene una membresía asignada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Código de asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          {client.attendanceCode ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-lg tracking-[0.3em] text-foreground">
                  {codeRevealed ? client.attendanceCode : "•• •• ••"}
                </span>
                <button
                  type="button"
                  title={codeRevealed ? "Ocultar" : "Mostrar"}
                  onClick={() => setCodeRevealed((prev) => !prev)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {codeRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4" />
                  {codeCopied ? "Copiado" : "Copiar"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={codeBusy}
                  onClick={() => setCodeConfirmOpen(true)}
                >
                  <RotateCw className="h-4 w-4" />
                  Cambiar código
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Este cliente todavía no tiene un código de asistencia asignado.
              </p>
              <Button size="sm" disabled={codeBusy} onClick={handleGenerateOrRegenerateCode}>
                <KeyRound className="h-4 w-4" />
                Generar código
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {gymId && <FaceEnrollmentCard gymId={gymId} client={client} onChanged={loadClient} />}

      {gymId && (
        <ClientAppAccessCard
          gymId={gymId}
          clientId={client.id}
          clientEmail={client.email}
          cloudUid={client.cloudUid}
          onCreated={loadClient}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Medidas corporales actuales</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/progreso?clientId=${client.id}`)}>
            <LineChart className="h-4 w-4" />
            Ver progreso
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
            <InfoRow label="Peso" value={formatMeasurement(client.weight, "kg")} />
            <InfoRow
              label="Altura"
              value={formatMeasurement(client.height !== null ? metersToCm(client.height) : null, "cm")}
            />
            <InfoRow
              label="IMC"
              value={
                bmi !== null
                  ? `${bmi.toFixed(1)}${bmiCategory ? ` (${BMI_CATEGORY_LABELS[bmiCategory]})` : ""}`
                  : "Sin datos suficientes"
              }
            />
            <InfoRow label="Cintura" value={formatMeasurement(client.waist, "cm")} />
            <InfoRow label="Pecho" value={formatMeasurement(client.chest, "cm")} />
            <InfoRow label="Brazo" value={formatMeasurement(client.arm, "cm")} />
            <InfoRow label="Muslo" value={formatMeasurement(client.leg, "cm")} />
            <InfoRow label="Pantorrilla" value={formatMeasurement(client.calf, "cm")} />
            <InfoRow label="Cadera" value={formatMeasurement(client.hip, "cm")} />
            <InfoRow label="Masa muscular" value={formatMeasurement(client.muscleMass, "kg")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de membresías</CardTitle>
        </CardHeader>
        <CardContent>
          {membershipHistory.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Este cliente todavía no tiene membresías registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Plan</th>
                    <th className="py-2 pr-3 font-medium">Inicio</th>
                    <th className="py-2 pr-3 font-medium">Vencimiento</th>
                    <th className="py-2 pr-3 font-medium">Precio</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {membershipHistory.map((membership) => (
                    <tr key={membership.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{membership.planName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(membership.startDate)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(membership.endDate)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatCurrency(membership.price)}</td>
                      <td className="py-2.5 pr-3">
                        <MembershipStatusBadge status={membership.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormModal
        open={editOpen}
        gymId={gymId ?? ""}
        client={client}
        trainers={trainers}
        onClose={() => setEditOpen(false)}
        onSaved={loadClient}
      />

      <ConfirmDialog
        open={codeConfirmOpen}
        title="Cambiar código de asistencia"
        description="El código actual dejará de funcionar de inmediato. Deberás comunicarle el nuevo código al cliente."
        confirmLabel="Cambiar código"
        onConfirm={handleGenerateOrRegenerateCode}
        onCancel={() => setCodeConfirmOpen(false)}
      />
    </div>
  );
}
