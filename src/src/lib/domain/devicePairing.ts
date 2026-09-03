export type PairingCodeStatus = "PENDING" | "USED" | "EXPIRED" | "CANCELLED";
export type DeviceStatus = "PENDING" | "ACTIVE" | "DISABLED" | "REVOKED";

export interface PairingEvaluationInput {
  codeFound: boolean;
  codeStatus?: PairingCodeStatus;
  expiresAt?: string;
  deviceStatus?: DeviceStatus;
  now?: Date;
}

export type PairingDecision =
  | { kind: "APPROVED" }
  | { kind: "DENIED_CODE_NOT_FOUND" }
  | { kind: "DENIED_EXPIRED" }
  | { kind: "DENIED_ALREADY_USED" }
  | { kind: "DENIED_CANCELLED" }
  | { kind: "DENIED_DEVICE_NOT_PENDING" };

/**
 * Regla pura de vinculación de dispositivos, mismo estilo que
 * evaluateAccess: nunca compara el código contra un valor fijo, siempre
 * recibe ya resuelto el estado real desde datos del gimnasio. El código es
 * de un solo uso, temporal y nunca sirve como credencial administrativa.
 */
export function evaluatePairingAttempt(input: PairingEvaluationInput): PairingDecision {
  if (!input.codeFound) {
    return { kind: "DENIED_CODE_NOT_FOUND" };
  }

  if (input.codeStatus === "CANCELLED") {
    return { kind: "DENIED_CANCELLED" };
  }

  if (input.codeStatus === "USED") {
    return { kind: "DENIED_ALREADY_USED" };
  }

  const now = input.now ?? new Date();
  const isExpired = input.codeStatus === "EXPIRED" || (input.expiresAt !== undefined && new Date(input.expiresAt) < now);
  if (isExpired) {
    return { kind: "DENIED_EXPIRED" };
  }

  if (input.deviceStatus !== "PENDING") {
    return { kind: "DENIED_DEVICE_NOT_PENDING" };
  }

  return { kind: "APPROVED" };
}
