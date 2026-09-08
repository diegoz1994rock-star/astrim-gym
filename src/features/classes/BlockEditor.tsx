import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ExerciseConfigFields } from "@/components/ExerciseConfigFields";
import {
  getCardioEquipmentProfile,
  getExerciseConfigurationMode,
  hasLegacyStrengthValues,
  resolveEffectiveMode,
} from "@/lib/domain/exerciseConfigMode";
import { ExercisePickerModal } from "./ExercisePickerModal";
import {
  CLASS_BLOCK_TYPE_LABELS,
  emptyClassBlockExerciseForm,
  emptyClassBlockForm,
  type ClassBlockFormInput,
  type ClassBlockType,
} from "@/types/class";
import type { ExerciseOptionRow } from "@/types/db";

const BLOCK_TYPES = Object.keys(CLASS_BLOCK_TYPE_LABELS) as ClassBlockType[];

interface BlockEditorProps {
  blocks: ClassBlockFormInput[];
  exercises: ExerciseOptionRow[];
  onChange: (blocks: ClassBlockFormInput[]) => void;
}

/**
 * Una clase no está limitada a una lista plana de ejercicios: se organiza
 * en bloques (Calentamiento, Fuerza, WOD...), cada uno con su propio orden
 * y su propia lista de ejercicios. No existe drag-and-drop en el proyecto
 * — reordenar es con flechas arriba/abajo, igual de simple y sin agregar
 * una librería nueva.
 */
export function BlockEditor({ blocks, exercises, onChange }: BlockEditorProps) {
  const [pickerForBlock, setPickerForBlock] = useState<number | null>(null);

  function updateBlock(index: number, patch: Partial<ClassBlockFormInput>) {
    onChange(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function addBlock() {
    onChange([...blocks, emptyClassBlockForm()]);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addExercisesToBlock(index: number, exerciseIds: string[]) {
    const block = blocks[index];
    const newExercises = exerciseIds.map((exerciseId) => ({ ...emptyClassBlockExerciseForm(), exerciseId }));
    updateBlock(index, { exercises: [...block.exercises, ...newExercises] });
  }

  function updateExercise(blockIndex: number, exIndex: number, patch: Partial<ClassBlockFormInput["exercises"][number]>) {
    const block = blocks[blockIndex];
    updateBlock(blockIndex, {
      exercises: block.exercises.map((ex, i) => (i === exIndex ? { ...ex, ...patch } : ex)),
    });
  }

  function removeExercise(blockIndex: number, exIndex: number) {
    const block = blocks[blockIndex];
    updateBlock(blockIndex, { exercises: block.exercises.filter((_, i) => i !== exIndex) });
  }

  function catalogExercise(exerciseId: string): ExerciseOptionRow | undefined {
    return exercises.find((ex) => ex.id === exerciseId);
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, blockIndex) => (
        <div key={blockIndex} className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={block.name}
              onChange={(e) => updateBlock(blockIndex, { name: e.target.value })}
              className="flex-1"
              placeholder="Nombre del bloque"
            />
            <Select
              value={block.blockType}
              onChange={(e) => updateBlock(blockIndex, { blockType: e.target.value as ClassBlockType })}
              className="w-44"
            >
              {BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CLASS_BLOCK_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveBlock(blockIndex, -1)} disabled={blockIndex === 0}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => moveBlock(blockIndex, 1)}
              disabled={blockIndex === blocks.length - 1}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeBlock(blockIndex)}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {block.exercises.map((exercise, exIndex) => {
              const catalog = catalogExercise(exercise.exerciseId);
              const catalogMode = getExerciseConfigurationMode(catalog?.exercise_type ?? null);
              const mode = resolveEffectiveMode(hasLegacyStrengthValues(exercise), catalogMode);
              const cardioProfile = getCardioEquipmentProfile(catalog?.equipment ?? null);
              return (
                <div key={exIndex} className="rounded-md bg-surface-muted p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {catalog?.name ?? "Ejercicio"}
                    </p>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeExercise(blockIndex, exIndex)}>
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-col gap-2.5">
                    <ExerciseConfigFields
                      value={exercise}
                      mode={mode}
                      cardioProfile={cardioProfile}
                      onChange={(patch) => updateExercise(blockIndex, exIndex, patch)}
                      dense
                    />
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="secondary" size="sm" onClick={() => setPickerForBlock(blockIndex)}>
              <Plus className="h-4 w-4" />
              Añadir ejercicios
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addBlock}>
        <Plus className="h-4 w-4" />
        Agregar bloque
      </Button>

      <ExercisePickerModal
        open={pickerForBlock !== null}
        exercises={exercises}
        excludedIds={pickerForBlock !== null ? blocks[pickerForBlock].exercises.map((e) => e.exerciseId) : []}
        onClose={() => setPickerForBlock(null)}
        onConfirm={(ids) => {
          if (pickerForBlock !== null) addExercisesToBlock(pickerForBlock, ids);
          setPickerForBlock(null);
        }}
      />
    </div>
  );
}
