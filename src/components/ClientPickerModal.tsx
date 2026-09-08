import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterClients } from "@/lib/domain/clientFilters";
import { DEFAULT_CLIENT_FILTERS, type ClientListItem } from "@/types/client";

interface ClientPickerModalProps {
  open: boolean;
  clients: ClientListItem[];
  selectedIds: string[];
  /** Cupo máximo de la clase; null = sin límite (aún no se ha definido). */
  capacity: number | null;
  onClose: () => void;
  onConfirm: (clientIds: string[]) => void;
}

/**
 * Solo selecciona entre clientes ya existentes (nunca crea uno nuevo).
 * La búsqueda reutiliza filterClients tal cual, así que también busca por
 * código de asistencia, documento y teléfono, no solo nombre.
 */
export function ClientPickerModal({ open, clients, selectedIds, capacity, onClose, onConfirm }: ClientPickerModalProps) {
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setPending(new Set(selectedIds));
      setSearch("");
    }
  }, [open, selectedIds]);

  const filtered = useMemo(
    () => filterClients(clients.filter((c) => c.status === "ACTIVE"), { ...DEFAULT_CLIENT_FILTERS, search }),
    [clients, search],
  );

  const atCapacity = capacity !== null && pending.size >= capacity;

  function toggle(id: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (!atCapacity) {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    const allSelected = filtered.every((c) => pending.has(c.id));
    setPending((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        for (const client of filtered) {
          if (capacity !== null && next.size >= capacity && !next.has(client.id)) break;
          next.add(client.id);
        }
      }
      return next;
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Seleccionar clientes" widthClassName="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento, teléfono o código..."
            className="pl-9"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((c) => pending.has(c.id))}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border-strong"
          />
          Seleccionar todos
        </label>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {filtered.map((client) => {
            const checked = pending.has(client.id);
            const disabled = !checked && atCapacity;
            return (
              <label
                key={client.id}
                className={`flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-0 ${
                  disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(client.id)}
                    className="h-4 w-4 rounded border-border-strong"
                  />
                  <span className="text-foreground">{client.name}</span>
                </span>
                {client.document && <span className="text-xs text-muted-foreground">{client.document}</span>}
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Seleccionados: {pending.size}
            {capacity !== null && ` / ${capacity}`}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onConfirm(Array.from(pending))}>
              Agregar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
