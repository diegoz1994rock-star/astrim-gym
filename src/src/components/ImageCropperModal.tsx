import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  clampPan,
  clampZoom,
  computeCoverScale,
  computeSourceCropRect,
  type Point,
  type Size,
} from "@/lib/domain/imageCrop";
import {
  InvalidImageFileError,
  UnsupportedImageFormatError,
  exportCroppedJpeg,
  loadImageBitmapFromPath,
  rotateToCanvas,
} from "@/lib/services/photoService";

const ZOOM_STEP = 0.25;
const FRAME_BOX = 320; // caja máxima en px para calcular el tamaño visual del marco

/**
 * Editor de recorte reutilizable: marco fijo por aspectRatio, mover
 * (pointer events), zoom (botones + rueda/trackpad), rotar 90°, sin
 * espacios vacíos garantizado (ver imageCrop.ts). Exporta siempre un JPEG
 * de outputWidth x outputHeight — nunca la imagen original.
 */
export interface ImageCropperModalProps {
  open: boolean;
  /** Ruta local del archivo elegido por el usuario (aún no procesado). */
  imagePath: string | null;
  /** Ancho / alto deseado del marco de recorte, ej. 3/4. */
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  /** 0 a 1. Por defecto 0.82. */
  quality?: number;
  title?: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void | Promise<void>;
}

type Status = "loading" | "ready" | "error";

export function ImageCropperModal({
  open,
  imagePath,
  aspectRatio,
  outputWidth,
  outputHeight,
  quality = 0.82,
  title = "Ajustar fotografía",
  onCancel,
  onSave,
}: ImageCropperModalProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });

  const frameRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; panStart: Point } | null>(null);

  const frame: Size = useMemo(() => {
    if (aspectRatio >= 1) return { width: FRAME_BOX, height: FRAME_BOX / aspectRatio };
    return { width: FRAME_BOX * aspectRatio, height: FRAME_BOX };
  }, [aspectRatio]);

  // Carga la imagen (con corrección EXIF) cada vez que se abre el editor
  // con una ruta nueva. Nunca conserva la imagen anterior en memoria.
  useEffect(() => {
    if (!open || !imagePath) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    setRotation(0);
    setZoom(1);

    loadImageBitmapFromPath(imagePath)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        const canvas = rotateToCanvas(bitmap, 0);
        setSourceCanvas(canvas);
        setSourceImageUrl(canvas.toDataURL("image/png"));
        setPan(clampPan({ x: 0, y: 0 }, canvas, frame, computeCoverScale(canvas, frame)));
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof InvalidImageFileError || err instanceof UnsupportedImageFormatError
            ? err.message
            : "No se pudo cargar la fotografía.";
        setErrorMessage(message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imagePath]);

  // Libera la imagen decodificada al cerrar el editor (evita acumular memoria).
  useEffect(() => {
    if (open) return;
    bitmapRef.current?.close();
    bitmapRef.current = null;
    setSourceCanvas(null);
    setSourceImageUrl(null);
  }, [open]);

  const coverScale = sourceCanvas ? computeCoverScale(sourceCanvas, frame) : 1;
  const effectiveScale = coverScale * zoom;
  const displayWidth = sourceCanvas ? sourceCanvas.width * effectiveScale : 0;
  const displayHeight = sourceCanvas ? sourceCanvas.height * effectiveScale : 0;

  function applyRotation(deltaDeg: number) {
    const bitmap = bitmapRef.current;
    if (!bitmap) return;
    const nextRotation = rotation + deltaDeg;
    const canvas = rotateToCanvas(bitmap, nextRotation);
    setRotation(nextRotation);
    setSourceCanvas(canvas);
    setSourceImageUrl(canvas.toDataURL("image/png"));
    setZoom(1);
    setPan(clampPan({ x: 0, y: 0 }, canvas, frame, computeCoverScale(canvas, frame)));
  }

  function applyZoom(nextZoom: number) {
    if (!sourceCanvas) return;
    const clamped = clampZoom(nextZoom);
    setZoom(clamped);
    setPan((prev) => clampPan(prev, sourceCanvas, frame, coverScale * clamped));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!sourceCanvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startY: event.clientY, panStart: pan };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current || !sourceCanvas) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    const next = {
      x: dragState.current.panStart.x + dx,
      y: dragState.current.panStart.y + dy,
    };
    setPan(clampPan(next, sourceCanvas, frame, effectiveScale));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = null;
  }

  // Rueda/trackpad: listener nativo no pasivo para poder bloquear el scroll
  // de la página mientras se hace zoom dentro del marco.
  useEffect(() => {
    const node = frameRef.current;
    if (!node || status !== "ready") return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      applyZoom(zoom + direction * (ZOOM_STEP / 2));
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, zoom, sourceCanvas, frame]);

  async function handleConfirm() {
    if (!sourceCanvas) return;
    setSaving(true);
    try {
      const rect = computeSourceCropRect(pan, sourceCanvas, frame, effectiveScale);
      const blob = await exportCroppedJpeg(sourceCanvas, rect, {
        outputWidth,
        outputHeight,
        quality,
      });
      await onSave(blob);
    } catch {
      setErrorMessage("No se pudo generar la imagen final.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title={title} widthClassName="max-w-md">
      <div className="flex flex-col items-center gap-4">
        {status === "loading" && (
          <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando imagen...
          </div>
        )}

        {status === "error" && (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-danger">{errorMessage}</p>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cerrar
            </Button>
          </div>
        )}

        {status === "ready" && sourceCanvas && sourceImageUrl && (
          <>
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative touch-none select-none overflow-hidden rounded-lg border-2 border-primary bg-muted"
              style={{ width: frame.width, height: frame.height, cursor: "grab" }}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={sourceImageUrl}
                draggable={false}
                className="absolute left-0 top-0 max-w-none"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  transformOrigin: "0 0",
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => applyZoom(zoom - ZOOM_STEP)}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Alejar"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-14 text-center text-xs text-muted-foreground">Zoom</span>
              <button
                type="button"
                onClick={() => applyZoom(zoom + ZOOM_STEP)}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Acercar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => applyRotation(-90)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Rotar
              </button>
              <button
                type="button"
                onClick={() => applyRotation(90)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <RotateCw className="h-4 w-4" />
                Rotar
              </button>
            </div>
          </>
        )}

        <div className="flex w-full justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={status !== "ready" || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Recortar y guardar"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
