import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck, Eye, LogOut, MonitorSmartphone, Plus, Search, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as attendanceService from "@/lib/services/attendanceService";
import { filterAttendance } from "@/lib/domain/attendanceFilters";
import { onAttendanceChanged } from "@/lib/events/attendanceEvents";
import { formatDate } from "@/lib/format";
import {
  ATTENDANCE_METHOD_LABELS,
  DEFAULT_ATTENDANCE_FILTERS,
  type AttendanceFilters,
  type AttendanceListItem,
  type AttendanceSummary,
} from "@/types/attendance";
import type { ClientListItem } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { AttendanceCheckInModal } from "./AttendanceCheckInModal";
import { AttendanceDetailModal } from "./AttendanceDetailModal";

function todayIso(): string {
  // Fecha local del equipo (no UTC): así coincide con la columna `date` de
  // asistencia, que ahora también se guarda en hora local.
  return new Date().toLocaleDateString("en-CA");
}

export function AttendancePage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceFilters>(DEFAULT_ATTENDANCE_FILTERS);

  useEffect(() => {
    if (searchParams.get("range") === "today") {
      const today = todayIso();
      setFilters((prev) => ({ ...prev, dateFrom: today, dateTo: today }));
    }
  }, [searchParams]);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<AttendanceListItem | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, attendanceData, summaryData] = await Promise.all([
        clientService.getClients(gymId),
        attendanceService.getAttendance(gymId),
        attendanceService.getAttendanceSummary(gymId),
      ]);
      setClients(clientsData);
      setAttendance(attendanceData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información de asistencia.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cuando alguien marca en la app de asistencia (por LAN) o en el kiosco,
  // accessService emite este aviso y la tabla se recarga sola.
  useEffect(() => onAttendanceChanged(() => void loadData()), [loadData]);

  const todayAttendance = useMemo(() => {
    const today = todayIso();
    return attendance.filter((record) => record.date === today);
  }, [attendance]);

  const filteredAttendance = useMemo(() => filterAttendance(attendance, filters), [attendance, filters]);

  async function handleCheckOut(record: AttendanceListItem) {
    if (!gymId) return;
    setCheckingOutId(record.id);
    try {
      await attendanceService.registerCheckOut(gymId, record.id);
      await loadData();
    } finally {
      setCheckingOutId(null);
    }
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Asistencia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra y consulta la asistencia de los clientes de tu gimnasio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/kiosko")}>
            <MonitorSmartphone className="h-4 w-4" />
            Modo recepción
          </Button>
          <Button onClick={() => setCheckInOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar asistencia
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Asistencias de hoy"
          value={(summary?.today ?? 0).toLocaleString("es-CO")}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard
          label="Dentro ahora mismo"
          value={(summary?.insideNow ?? 0).toLocaleString("es-CO")}
          icon={Users}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Asistencias del mes"
          value={(summary?.thisMonth ?? 0).toLocaleString("es-CO")}
          icon={CalendarCheck}
          tone="primary"
          delay={0.1}
        />
        <StatCard
          label="Promedio diario (mes)"
          value={(summary?.averagePerDayThisMonth ?? 0).toLocaleString("es-CO", {
            maximumFractionDigits: 1,
          })}
          icon={TrendingUp}
          tone="warning"
          delay={0.15}
        />
      </div>

      {summary && summary.topAttendees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes que más asistieron este mes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-2">
            {summary.topAttendees.map((attendee, index) => (
              <Badge key={attendee.clientId} tone={index === 0 ? "success" : "neutral"}>
                {attendee.clientName} — {attendee.visits} {attendee.visits === 1 ? "visita" : "visitas"}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por cliente o documento..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[340px] lg:shrink-0">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              title="Desde"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              title="Hasta"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}

        {!error && loading && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Cargando asistencia...
          </div>
        )}

        {!error && !loading && filteredAttendance.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <CalendarCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {attendance.length === 0
                ? "Aún no hay asistencias registradas."
                : "No se encontraron asistencias con estos filtros."}
            </p>
            {attendance.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Registra la primera con el botón "Registrar asistencia".
              </p>
            )}
          </div>
        )}

        {!error && !loading && filteredAttendance.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Entrada</th>
                  <th className="px-3 py-3 font-medium">Salida</th>
                  <th className="px-3 py-3 font-medium">Método</th>
                  <th className="px-3 py-3 font-medium">Membresía</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{record.clientName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(record.date)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{record.checkIn ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{record.checkOut ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {record.exitMethod
                        ? ATTENDANCE_METHOD_LABELS[record.exitMethod]
                        : record.entryMethod
                          ? ATTENDANCE_METHOD_LABELS[record.entryMethod]
                          : "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{record.planName ?? "—"}</td>
                    <td className="px-3 py-3">
                      {record.isInside ? (
                        <Badge tone="success">Dentro</Badge>
                      ) : (
                        <Badge tone="neutral">Salió</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ver"
                          onClick={() => setDetailTarget(record)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {record.isInside && (
                          <button
                            type="button"
                            title="Registrar salida"
                            disabled={checkingOutId === record.id}
                            onClick={() => handleCheckOut(record)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AttendanceCheckInModal
        open={checkInOpen}
        gymId={gymId}
        clients={clients}
        todayAttendance={todayAttendance}
        onClose={() => setCheckInOpen(false)}
        onChanged={loadData}
      />

      <AttendanceDetailModal
        open={detailTarget !== null}
        record={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}
