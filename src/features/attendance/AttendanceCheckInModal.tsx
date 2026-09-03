import { useMemo, useState } from "react";
import { CheckCircle2, LogIn, LogOut, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MembershipStatusBadge } from "@/components/StatusBadges";
import { normalizeSearchText } from "@/lib/utils";
import * as attendanceService from "@/lib/services/attendanceService";
import type { ClientListItem } from "@/types/client";
import type { AttendanceListItem } from "@/types/attendance";

interface AttendanceCheckInModalProps {
  open: boolean;
  gymId: string;
  clients: ClientListItem[];
  todayAttendance: AttendanceListItem[];
  onClose: () => void;
  onChanged: () => void;
}

export function AttendanceCheckInModal({
  open,
  gymId,
  clients,
  todayAttendance,
  onClose,
  onChanged,
}: AttendanceCheckInModalProps) {
  const [search, setSearch] = useState("");
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const openAttendanceByClient = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of todayAttendance) {
      if (record.isInside) map.set(record.clientId, record.id);
    }
    return map;
  }, [todayAttendance]);

  const filteredClients = useMemo(() => {
    const query = normalizeSearchText(search.trim());
    const activeClients = clients.filter((c) => c.status === "ACTIVE");
    if (!query) return activeClients.slice(0, 8);
    return activeClients
      .filter((c) => normalizeSearchText(`${c.name} ${c.document ?? ""}`).includes(query))
      .slice(0, 8);
  }, [clients, search]);

  function handleClose() {
    setSearch("");
    setFeedback(null);
    setPendingClientId(null);
    onClose();
  }

  async function handleCheckIn(client: ClientListItem) {
    setPendingClientId(client.id);
    setFeedback(null);
    try {
      await attendanceService.registerAttendance(gymId, { clientId: client.id, notes: "" });
      setFeedback({ type: "success", message: `Entrada registrada para ${client.name}.` });
      setSearch("");
      onChanged();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo registrar la entrada.",
      });
    } finally {
      setPendingClientId(null);
    }
  }

  async function handleCheckOut(client: ClientListItem, attendanceId: string) {
    setPendingClientId(client.id);
    setFeedback(null);
    try {
      await attendanceService.registerCheckOut(gymId, attendanceId);
      setFeedback({ type: "success", message: `Salida registrada para ${client.name}.` });
      onChanged();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo registrar la salida.",
      });
    } finally {
      setPendingClientId(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar asistencia"
      description="Busca al cliente y registra su entrada o salida. El cuadro permanece abierto para seguir registrando."
      widthClassName="max-w-lg"
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          className="pl-10"
          placeholder="Buscar por nombre o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "mb-3 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
              : "mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {feedback.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {filteredClients.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No se encontraron clientes activos con ese nombre o documento.
          </p>
        )}

        {filteredClients.map((client) => {
          const openAttendanceId = openAttendanceByClient.get(client.id);
          const isPending = pendingClientId === client.id;

          return (
            <div
              key={client.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{client.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{client.document ?? "Sin documento"}</span>
                  <MembershipStatusBadge status={client.membershipStatus} />
                </div>
              </div>

              {openAttendanceId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleCheckOut(client, openAttendanceId)}
                >
                  <LogOut className="h-4 w-4" />
                  Salida
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleCheckIn(client)}
                >
                  <LogIn className="h-4 w-4" />
                  Entrada
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
