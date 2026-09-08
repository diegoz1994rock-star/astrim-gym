import * as faceapi from "@vladmandic/face-api";

const MODELS_URL = "/models";

/**
 * Único módulo que importa face-api. Todo lo demás (FaceCaptureModal,
 * KioskPage, FaceEnrollmentCard) pasa por detectFace() y nunca toca
 * face-api directamente — así el motor se puede cambiar sin tocar la UI.
 */

let loadPromise: Promise<void> | null = null;

/**
 * face-api reexporta tfjs-core completo en tiempo de ejecución (registra
 * los backends webgl y cpu como efecto secundario al importar el paquete),
 * pero su .d.ts solo tipa un subconjunto — setBackend/ready existen en el
 * objeto real aunque TypeScript no los conozca.
 */
interface TfBackendControls {
  setBackend(name: string): Promise<boolean>;
  ready(): Promise<void>;
}

async function selectBackend(): Promise<void> {
  const tf = faceapi.tf as unknown as TfBackendControls;
  try {
    await tf.setBackend("webgl");
  } catch {
    await tf.setBackend("cpu");
  }
  await tf.ready();
}

export async function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await selectBackend();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
    })();
  }
  return loadPromise;
}

export type FaceQuality = "NO_FACE" | "TOO_FAR" | "TOO_CLOSE" | "GOOD";

export interface FaceDetectionResult {
  quality: FaceQuality;
  /** Ancho del rostro relativo al ancho del frame (0-1). Solo con rostro detectado. */
  sizeRatio: number | null;
  /** Embedding de 128 floats, listo para guardar/comparar. Solo si quality === "GOOD". */
  descriptor: number[] | null;
}

/**
 * Rango de tamaño "ideal" del rostro (ancho relativo al frame). Fuera de
 * él la calidad se reporta como TOO_FAR / TOO_CLOSE para guiar al usuario.
 * Es más ancho que antes: distintas cámaras (webcam USB, celular como
 * cámara virtual, tablet) encuadran muy diferente y el rango viejo
 * (0.25–0.55) dejaba fuera montajes válidos.
 */
const MIN_FACE_WIDTH_RATIO = 0.16;
const MAX_FACE_WIDTH_RATIO = 0.72;

export interface DetectFaceOptions {
  /**
   * "goodSizeOnly" (por defecto): solo devuelve embedding si el tamaño está
   * en el rango ideal — para ENROLAR, donde importa la calidad.
   * "always": devuelve embedding con cualquier rostro detectado — para
   * RECONOCER, donde el umbral de distancia ya filtra y un rostro un poco
   * lejos/cerca no debería impedir el match.
   */
  descriptorMode?: "goodSizeOnly" | "always";
}

/**
 * Detecta un único rostro en el frame actual del video y calcula su
 * embedding. Con `descriptorMode: "always"` lo devuelve aunque el tamaño no
 * sea el ideal (la `quality` sigue reflejando si conviene acercarse/alejarse).
 */
export async function detectFace(
  video: HTMLVideoElement,
  options: DetectFaceOptions = {},
): Promise<FaceDetectionResult> {
  const { descriptorMode = "goodSizeOnly" } = options;
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result || !video.videoWidth) {
    return { quality: "NO_FACE", sizeRatio: null, descriptor: null };
  }

  const sizeRatio = result.detection.box.width / video.videoWidth;
  const quality: FaceQuality =
    sizeRatio < MIN_FACE_WIDTH_RATIO ? "TOO_FAR"
    : sizeRatio > MAX_FACE_WIDTH_RATIO ? "TOO_CLOSE"
    : "GOOD";

  const descriptor =
    descriptorMode === "always" || quality === "GOOD"
      ? Array.from(result.descriptor)
      : null;

  return { quality, sizeRatio, descriptor };
}
