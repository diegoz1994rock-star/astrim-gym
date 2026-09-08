import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useFaceCamera } from "@/hooks/useFaceCamera";
import { useVideoInputs } from "@/hooks/useVideoInputs";
import { loadFaceModels, detectFace, type FaceQuality } from "@/lib/face/faceEngine";
import { cn } from "@/lib/utils";

/** Cámara elegida para reconocimiento facial, por equipo (una tablet/PC). */
const FACE_CAMERA_STORAGE_KEY = "astrim.faceCameraId";

function getStoredFaceCameraId(): string | null {
  try {
    return localStorage.getItem(FACE_CAMERA_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeFaceCameraId(id: string): void {
  try {
    localStorage.setItem(FACE_CAMERA_STORAGE_KEY, id);
  } catch {
    /* almacenamiento no disponible: la elección vale solo para esta sesión */
  }
}

type ModalStatus =
  | "LOADING_MODELS"
  | "REQUESTING_PERMISSION"
  | "DETECTING"
  | "CAPTURED"
  | "MODEL_LOAD_ERROR"
  | "PERMISSION_DENIED"
  | "CAMERA_ERROR";

const DETECTION_INTERVAL_MS = 350;
/** Frames "GOOD" consecutivos antes de auto-capturar en modo ENROLL, para
 * no quedarnos con un frame suelto de mala calidad por movimiento. */
const STABLE_FRAMES_TO_CAPTURE = 4;

interface FaceCaptureModalProps {
  open: boolean;
  mode: "ENROLL" | "RECOGNIZE";
  title: string;
  onClose: () => void;
  /** ENROLL: se llama una vez, con el embedding ya calculado. */
  onCaptured?: (descriptor: number[]) => void;
  /** RECOGNIZE: se llama en cada frame de buena calidad; el caller decide
   * cuándo hay coincidencia y cierra el modal. */
  onFrameDescriptor?: (descriptor: number[]) => void;
}

const QUALITY_MESSAGES: Record<FaceQuality, string> = {
  NO_FACE: "Ubica tu rostro frente a la cámara",
  TOO_FAR: "Acércate un poco más",
  TOO_CLOSE: "Aléjate un poco",
  GOOD: "✓ Rostro detectado",
};

export function FaceCaptureModal({
  open,
  mode,
  title,
  onClose,
  onCaptured,
  onFrameDescriptor,
}: FaceCaptureModalProps) {
  const [status, setStatus] = useState<ModalStatus>("LOADING_MODELS");
  const [quality, setQuality] = useState<FaceQuality>("NO_FACE");
  const [cameraId, setCameraId] = useState<string | null>(() => getStoredFaceCameraId());
  const cameraActive = open && status !== "LOADING_MODELS" && status !== "MODEL_LOAD_ERROR";
  const { videoRef, status: cameraStatus, activeDeviceId } = useFaceCamera(cameraActive, cameraId);
  const { devices: cameras, refresh: refreshCameras } = useVideoInputs(cameraActive);
  const stableCountRef = useRef(0);
  const capturedRef = useRef(false);

  // Las etiquetas de las cámaras recién aparecen tras conceder el permiso.
  useEffect(() => {
    if (cameraStatus === "STREAMING") refreshCameras();
  }, [cameraStatus, refreshCameras]);

  function handleCameraChange(id: string) {
    setCameraId(id);
    storeFaceCameraId(id);
  }

  useEffect(() => {
    if (!open) return;
    capturedRef.current = false;
    stableCountRef.current = 0;
    setQuality("NO_FACE");
    setStatus("LOADING_MODELS");
    loadFaceModels()
      .then(() => setStatus("REQUESTING_PERMISSION"))
      .catch(() => setStatus("MODEL_LOAD_ERROR"));
  }, [open]);

  useEffect(() => {
    if (!open || status === "LOADING_MODELS" || status === "MODEL_LOAD_ERROR") return;
    if (cameraStatus === "PERMISSION_DENIED") {
      setStatus("PERMISSION_DENIED");
    } else if (cameraStatus === "CAMERA_ERROR") {
      setStatus("CAMERA_ERROR");
    } else if (cameraStatus === "STREAMING") {
      setStatus((prev) => (prev === "REQUESTING_PERMISSION" ? "DETECTING" : prev));
    }
  }, [open, cameraStatus, status]);

  useEffect(() => {
    if (status !== "DETECTING") return;
    let cancelled = false;
    let busy = false;
    const interval = setInterval(() => {
      if (busy || cancelled || capturedRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      busy = true;
      // Al reconocer aceptamos el embedding aunque el rostro esté un poco
      // lejos/cerca (el umbral de distancia ya filtra). Al enrolar exigimos
      // buen tamaño para guardar una plantilla de calidad.
      detectFace(video, { descriptorMode: mode === "RECOGNIZE" ? "always" : "goodSizeOnly" })
        .then((result) => {
          if (cancelled || capturedRef.current) return;
          setQuality(result.quality);
          if (mode === "RECOGNIZE") {
            if (result.descriptor) onFrameDescriptor?.(result.descriptor);
          } else if (result.quality === "GOOD" && result.descriptor) {
            stableCountRef.current += 1;
            if (stableCountRef.current >= STABLE_FRAMES_TO_CAPTURE) {
              capturedRef.current = true;
              setStatus("CAPTURED");
              onCaptured?.(result.descriptor);
            }
          } else {
            stableCountRef.current = 0;
          }
        })
        .finally(() => {
          busy = false;
        });
    }, DETECTION_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, mode, videoRef, onCaptured, onFrameDescriptor]);

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-md">
      <div className="flex flex-col items-center gap-4">
        <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          {status === "DETECTING" && (
            <div
              className={cn(
                "pointer-events-none absolute inset-6 rounded-full border-4",
                quality === "GOOD" ? "border-success" : "border-white/50",
              )}
            />
          )}
        </div>

        {cameras.length > 1 && status !== "PERMISSION_DENIED" && status !== "MODEL_LOAD_ERROR" && (
          <label className="flex w-full max-w-xs flex-col gap-1 text-xs text-muted-foreground">
            Cámara
            <Select
              value={cameraId ?? activeDeviceId ?? ""}
              onChange={(e) => handleCameraChange(e.target.value)}
            >
              {cameras.map((cam, i) => (
                <option key={cam.deviceId || i} value={cam.deviceId}>
                  {cam.label || `Cámara ${i + 1}`}
                </option>
              ))}
            </Select>
          </label>
        )}

        {(status === "LOADING_MODELS" || status === "REQUESTING_PERMISSION") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === "LOADING_MODELS"
              ? "Cargando reconocimiento facial…"
              : "Solicitando acceso a la cámara…"}
          </div>
        )}

        {status === "DETECTING" && (
          <p className={cn("text-sm font-medium", quality === "GOOD" ? "text-success" : "text-muted-foreground")}>
            {QUALITY_MESSAGES[quality]}
          </p>
        )}

        {status === "CAPTURED" && <p className="text-sm font-medium text-success">✓ Rostro registrado</p>}

        {(status === "PERMISSION_DENIED" || status === "CAMERA_ERROR" || status === "MODEL_LOAD_ERROR") && (
          <div className="flex flex-col items-center gap-2 text-center">
            <ShieldAlert className="h-8 w-8 text-danger" />
            <p className="text-sm text-danger">
              {status === "PERMISSION_DENIED"
                ? "Se necesita permiso de cámara para continuar."
                : status === "MODEL_LOAD_ERROR"
                  ? "No se pudo cargar el reconocimiento facial."
                  : "No se pudo acceder a la cámara."}
            </p>
            {mode === "RECOGNIZE" && (
              <p className="text-xs text-muted-foreground">Utiliza tu código de asistencia.</p>
            )}
          </div>
        )}

        <Button type="button" variant="secondary" onClick={onClose} className="w-full">
          {status === "CAPTURED" ? "Cerrar" : "Cancelar"}
        </Button>
      </div>
    </Modal>
  );
}
