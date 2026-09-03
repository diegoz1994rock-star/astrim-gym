/**
 * NO IMPLEMENTADO. No hay torniquete ni controlador físico conectado.
 * Interfaz conceptual para cuando exista ese hardware: accessService
 * podría llamar a authorizeAccess/denyAccess tras evaluar el PIN, sin
 * cambiar la lógica de negocio.
 */
export interface AccessGateController {
  authorizeAccess(clientId: string): Promise<void>;
  denyAccess(reason: string): Promise<void>;
  openGate(): Promise<void>;
}
