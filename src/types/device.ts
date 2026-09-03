import type { DeviceStatus, DeviceType } from "./db";

export type { DeviceStatus, DeviceType };

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  RECEPTION_TABLET: "Tablet de recepción",
  ADMIN_COMPUTER: "Computador administrativo",
  BIOMETRIC_READER: "Lector biométrico",
  ACCESS_GATE: "Torniquete",
  OTHER: "Otro",
};

export interface DeviceListItem {
  id: string;
  name: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  platform: string | null;
  appVersion: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
}

export interface PairingCodeResult {
  deviceId: string;
  code: string;
  expiresAt: string;
}
