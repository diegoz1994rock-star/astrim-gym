import { useEffect, useRef, useState } from "react";

export type CameraStatus = "REQUESTING_PERMISSION" | "STREAMING" | "PERMISSION_DENIED" | "CAMERA_ERROR";

/**
 * Maneja únicamente el ciclo de vida de getUserMedia (permiso, stream,
 * limpieza). No sabe nada de detección facial: eso lo hace faceEngine a
 * partir del <video> que este hook expone.
 */
export function useFaceCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("REQUESTING_PERMISSION");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus("REQUESTING_PERMISSION");

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("STREAMING");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const isPermissionError =
          err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
        setStatus(isPermissionError ? "PERMISSION_DENIED" : "CAMERA_ERROR");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [active]);

  return { videoRef, status };
}
