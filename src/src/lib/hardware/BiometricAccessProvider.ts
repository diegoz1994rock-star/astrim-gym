/**
 * NO IMPLEMENTADO. No hay lector biométrico conectado. Esta interfaz deja
 * lista la forma de un futuro proveedor de huella: recibe un identificador
 * biométrico ya capturado por el hardware y lo resuelve a un client_id,
 * reutilizando desde ahí el mismo accessService/evaluateAccess que usa el
 * PIN. Explícitamente prohibido en esta fase: guardar imágenes o plantillas
 * de huellas en la base de datos.
 */
export interface BiometricAccessProvider {
  resolveClientId(gymId: string, biometricIdentifier: string): Promise<string | null>;
}
