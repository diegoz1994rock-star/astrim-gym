const TOKEN_BYTES = 32;

/**
 * Token propio del dispositivo (Bearer), emitido una sola vez al vincularse
 * con éxito. No es una contraseña de administrador ni se deriva de una:
 * es un secreto de alta entropía generado con crypto.getRandomValues,
 * exclusivo para autenticar las peticiones del dispositivo al servidor LAN.
 */
export function generateDeviceToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
