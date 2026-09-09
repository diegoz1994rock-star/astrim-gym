import { useEffect, useRef, useState } from "react";

export type CameraStatus = "REQUESTING_PERMISSION" | "STREAMING" | "PERMISSION_DENIED" | "CAMERA_ERROR";

/**
 * Maneja únicamente el ciclo de vida de getUserMedia (permiso, stream,
 * limpieza). No sabe nada de detección facial: eso lo hace faceEngine a
 * partir del <video> que este hook expone.
 *
 * `deviceId` opcional: si se pasa, se pide esa cámara concreta (PC con varias
 * webcams). Si no, se usa la cámara frontal (`facingMode: "user"`) — el
 * comportamiento de siempre, ideal para tablet/celular.
 */
export function useFaceCamera(active: boolean, deviceId?: string | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("REQUESTING_PERMISSION");
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus("REQUESTING_PERMISSION");

    const video: MediaTrackConstraints = deviceId
      ? { deviceId: { ideal: deviceId } }
      : { facingMode: "user" };

    // En algunos WebView (macOS sin permiso de cámara en Info.plist)
    // `navigator.mediaDevices` es `undefined`: acceder a `.getUserMedia`
    // tiraría un TypeError sincrónico que se come el try/catch y tumba la
    // app. Se corta acá con un error manejable.
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("CAMERA_ERROR");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setActiveDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? null);
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
  }, [active, deviceId]);

  return { videoRef, status, activeDeviceId };
}
