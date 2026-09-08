import { useCallback, useEffect, useState } from "react";
import { Plus, Smartphone, Trash2 } from "lucide-react";
import * as deviceService from "@/lib/services/deviceService";
import { DEVICE_TYPE_LABELS, type DeviceListItem } from "@/types/device";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddDeviceModal } from "./AddDeviceModal";

const STATUS_META: Record<DeviceListItem["status"], { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  PENDING: { label: "Pendiente de vinculación", tone: "warning" },
  ACTIVE: { label: "Activo", tone: "success" },
  DISABLED: { label: "Deshabilitado", tone: "neutral" },
  REVOKED: { label: "Revocado", tone: "danger" },
};

function formatRelativeTime(sqliteUtc: string | null): string {
  if (!sqliteUtc) return "Nunca";
  const then = new Date(`${sqliteUtc.replace(" ", "T")}Z`).getTime();
  const diffSeconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSeconds < 60) return `hace ${diffSeconds} segundos`;
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export function DevicesTab({ gymId }: { gymId: string }) {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DeviceListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      setDevices(await deviceService.getDevices(gymId));
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  async function confirmRevoke() {
    if (!revokeTarget) return;
    await deviceService.revokeDevice(gymId, revokeTarget.id);
    setRevokeTarget(null);
    await loadDevices();
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmDeleteSelected() {
    await deviceService.deleteDevices(gymId, [...selectedIds]);
    setSelectedIds(new Set());
    setDeleteConfirmOpen(false);
    await loadDevices();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dispositivos autorizados</h3>
          <p className="text-sm text-muted-foreground">
            Tablets de recepción y otros dispositivos vinculados a tu gimnasio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionado{selectedIds.size > 1 ? "s" : ""} ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar dispositivo
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando dispositivos...</p>}

      {!loading && devices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay dispositivos vinculados a este gimnasio.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {devices.map((device) => {
          const meta = STATUS_META[device.status];
          return (
            <Card key={device.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(device.id)}
                    onChange={() => toggleSelected(device.id)}
                    className="h-4 w-4 rounded border-border-strong"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{device.name}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {DEVICE_TYPE_LABELS[device.deviceType]}
                    </p>
                    {device.status === "ACTIVE" && (
                      <p className="text-xs text-muted-foreground">
                        Última conexión: {formatRelativeTime(device.lastSeenAt)}
                      </p>
                    )}
                  </div>
                </div>
                {(device.status === "ACTIVE" || device.status === "PENDING") && (
                  <Button variant="secondary" size="sm" onClick={() => setRevokeTarget(device)}>
                    Desvincular
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AddDeviceModal
        open={addOpen}
        gymId={gymId}
        onClose={() => setAddOpen(false)}
        onDeviceCreated={loadDevices}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Desvincular dispositivo"
        description={`"${revokeTarget?.name}" dejará de poder registrar asistencia de inmediato. Podrás vincularlo de nuevo generando un código nuevo.`}
        confirmLabel="Desvincular"
        danger
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Eliminar ${selectedIds.size > 1 ? "dispositivos" : "dispositivo"}`}
        description="Esto borra el/los registro(s) por completo (no solo los revoca). Si el dispositivo sigue instalado en una tablet, deberá vincularse de nuevo con un código nuevo para volver a funcionar."
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDeleteSelected}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
