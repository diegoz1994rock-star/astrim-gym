import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, Plus, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as measurementService from "@/lib/services/measurementService";
import * as routineService from "@/lib/services/routineService";
import { compareMeasurements } from "@/lib/domain/measurementComparison";
import { formatDate } from "@/lib/format";
import { metersToCm } from "@/lib/domain/validation";
import type { ClientListItem } from "@/types/client";
import type { MeasurementListItem } from "@/types/measurement";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { MeasurementFormModal } from "./MeasurementFormModal";
import { MeasurementDetailModal } from "./MeasurementDetailModal";

function formatDelta(value: number | null, unit: string, digits = 1): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} ${unit}`;
}

export function ProgressPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;

  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [measurements, setMeasurements] = useState<MeasurementListItem[]>([]);
  const [activeRoutineName, setActiveRoutineName] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<MeasurementListItem | null>(null);

  useEffect(() => {
    if (!gymId) return;
    setLoadingClients(true);
    clientService
      .getClients(gymId)
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes."))
      .finally(() => setLoadingClients(false));
  }, [gymId]);

  // Permite llegar desde el perfil de un cliente (Ver progreso) con su
  // cliente ya preseleccionado, sin cambiar el comportamiento de entrar
  // directamente a Progreso (selectedClientId sigue vacío por defecto).
  useEffect(() => {
    const clientId = searchParams.get("clientId");
    if (clientId && clients.some((c) => c.id === clientId)) {
      setSelectedClientId(clientId);
    }
  }, [searchParams, clients]);

  const loadClientProgress = useCallback(async () => {
    if (!gymId || !selectedClientId) return;
    setLoadingMeasurements(true);
    setError(null);
    try {
      const [measurementsData, routinesData] = await Promise.all([
        measurementService.getMeasurementsByClient(gymId, selectedClientId),
        routineService.getRoutinesByClient(gymId, selectedClientId),
      ]);
      setMeasurements(measurementsData);
      const activeRoutine = routinesData.find((r) => r.status === "ACTIVE") ?? null;
      setActiveRoutineName(activeRoutine?.name ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el progreso del cliente.");
    } finally {
      setLoadingMeasurements(false);
    }
  }, [gymId, selectedClientId]);

  useEffect(() => {
    loadClientProgress();
  }, [loadClientProgress]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const summary = useMemo(() => measurementService.buildProgressSummary(measurements), [measurements]);

  const comparison = useMemo(() => {
    if (measurements.length < 2) return null;
    return compareMeasurements(measurements[measurements.length - 2], measurements[measurements.length - 1]);
  }, [measurements]);

  const chartData = useMemo(
    () =>
      measurements
        .filter((m) => m.weight !== null)
        .map((m) => ({ date: formatDate(m.date), weight: m.weight })),
    [measurements],
  );

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Progreso</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta y registra la evolución física de los clientes de tu gimnasio.
        </p>
      </div>

      <Card className="p-4">
        <label className="mb-1.5 block text-sm font-medium text-foreground">Cliente</label>
        <Select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          disabled={loadingClients}
        >
          <option value="">
            {loadingClients ? "Cargando clientes..." : "Selecciona un cliente"}
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} {client.document ? `— ${client.document}` : ""}
            </option>
          ))}
        </Select>
      </Card>

      {error && <div className="text-sm text-danger">{error}</div>}

      {!error && !selectedClientId && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Selecciona un cliente para ver su progreso.
          </CardContent>
        </Card>
      )}

      {!error && selectedClientId && loadingMeasurements && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Cargando progreso...
          </CardContent>
        </Card>
      )}

      {!error && selectedClientId && !loadingMeasurements && selectedClient && (
        <>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{selectedClient.name}</h3>
              <p className="text-sm text-muted-foreground">
                {activeRoutineName ? `Rutina activa: ${activeRoutineName}` : "Sin rutina activa"}
              </p>
            </div>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar progreso
            </Button>
          </div>

          {summary.measurementCount === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Sin datos suficientes. Registra la primera medición de este cliente.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Peso actual"
                  value={summary.currentWeight !== null ? `${summary.currentWeight} kg` : "—"}
                  icon={Scale}
                  tone="primary"
                />
                <StatCard
                  label="Cambio de peso"
                  value={formatDelta(summary.weightDifference, "kg")}
                  icon={
                    summary.weightDifference !== null && summary.weightDifference < 0
                      ? TrendingDown
                      : TrendingUp
                  }
                  tone={
                    summary.weightDifference === null
                      ? "primary"
                      : summary.weightDifference < 0
                        ? "success"
                        : "warning"
                  }
                  hint={
                    summary.firstMeasurementDate
                      ? `Desde ${formatDate(summary.firstMeasurementDate)}`
                      : undefined
                  }
                  delay={0.05}
                />
                <StatCard
                  label="IMC actual"
                  value={summary.currentBmi !== null ? summary.currentBmi.toFixed(1) : "—"}
                  icon={Scale}
                  tone="primary"
                  delay={0.1}
                />
                <StatCard
                  label="Mediciones registradas"
                  value={summary.measurementCount.toLocaleString("es-CO")}
                  icon={Scale}
                  tone="primary"
                  delay={0.15}
                />
              </div>

              {comparison && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Comparación: {formatDate(comparison.previousDate)} → {formatDate(comparison.currentDate)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 pt-2 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDelta(comparison.weightDelta, "kg")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IMC</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDelta(comparison.bmiDelta, "", 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cintura</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDelta(comparison.waistDelta, "cm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Grasa corporal</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDelta(comparison.bodyFatDelta, "%")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evolución del peso</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                        />
                        <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value) => [`${value} kg`, "Peso"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="var(--color-primary)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Historial de mediciones</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-6 py-3 font-medium">Fecha</th>
                        <th className="px-3 py-3 font-medium">Peso</th>
                        <th className="px-3 py-3 font-medium">Altura</th>
                        <th className="px-3 py-3 font-medium">IMC</th>
                        <th className="px-3 py-3 font-medium">Observaciones</th>
                        <th className="px-6 py-3 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.map((measurement) => (
                        <tr
                          key={measurement.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-6 py-3 font-medium text-foreground">
                            {formatDate(measurement.date)}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {measurement.weight !== null ? `${measurement.weight} kg` : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {measurement.height !== null ? `${metersToCm(measurement.height)} cm` : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {measurement.bmi !== null ? measurement.bmi.toFixed(1) : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {measurement.notes || "—"}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              title="Ver"
                              onClick={() => setDetailTarget(measurement)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          <MeasurementFormModal
            open={formOpen}
            gymId={gymId}
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            onClose={() => setFormOpen(false)}
            onSaved={loadClientProgress}
          />

          <MeasurementDetailModal
            open={detailTarget !== null}
            measurement={detailTarget}
            onClose={() => setDetailTarget(null)}
          />
        </>
      )}
    </div>
  );
}
