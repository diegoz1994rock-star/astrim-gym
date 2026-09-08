import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeSearchText } from "@/lib/utils";
import type { ExerciseOptionRow } from "@/types/db";

interface ExercisePickerModalProps {
  open: boolean;
  exercises: ExerciseOptionRow[];
  /** Ejercicios ya agregados a este bloque, para no ofrecerlos de nuevo. */
  excludedIds: string[];
  onClose: () => void;
  onConfirm: (exerciseIds: string[]) => void;
}

/**
 * Solo selecciona entre ejercicios ya existentes en el catálogo (nunca
 * crea uno nuevo). Reutiliza exerciseService.getExerciseOptions, la misma
 * fuente que ya usa el selector de Rutinas.
 */
export function ExercisePickerModal({ open, exercises, excludedIds, onClose, onConfirm }: ExercisePickerModalProps) {
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setPending(new Set());
      setSearch("");
    }
  }, [open]);

  const available = useMemo(() => exercises.filter((ex) => !excludedIds.includes(ex.id)), [exercises, excludedIds]);

  const filtered = useMemo(() => {
    const term = normalizeSearchText(search.trim());
    if (!term) return available;
    return available.filter((ex) => normalizeSearchText(`${ex.name} ${ex.category ?? ""}`).includes(term));
  }, [available, search]);

  function toggle(id: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allSelected = filtered.length > 0 && filtered.every((ex) => pending.has(ex.id));
    setPending((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((ex) => next.delete(ex.id));
      else filtered.forEach((ex) => next.add(ex.id));
      return next;
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Seleccionar ejercicios" widthClassName="max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="pl-9"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((ex) => pending.has(ex.id))}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border-strong"
          />
          Seleccionar todos
        </label>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {filtered.map((exercise) => (
            <label
              key={exercise.id}
              className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-0 hover:bg-surface-muted"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pending.has(exercise.id)}
                  onChange={() => toggle(exercise.id)}
                  className="h-4 w-4 rounded border-border-strong"
                />
                <span className="text-foreground">{exercise.name}</span>
              </span>
              {exercise.category && <span className="text-xs text-muted-foreground">{exercise.category}</span>}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Seleccionados: {pending.size}</p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onConfirm(Array.from(pending))}>
              Agregar ejercicios
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
