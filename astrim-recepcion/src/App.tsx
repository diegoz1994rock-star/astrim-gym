import { useEffect, useState } from "react";
import { loadStoredDevice, saveStoredDevice, type StoredDevice } from "@/lib/deviceStorage";
import { PairingScreen } from "@/features/PairingScreen";
import { LinkedScreen } from "@/features/LinkedScreen";
import { AccessScreen } from "@/features/AccessScreen";
import { RevokedScreen } from "@/features/RevokedScreen";

type Screen = "LOADING" | "PAIRING" | "LINKED_SUCCESS" | "ACCESS" | "REVOKED";

export default function App() {
  const [screen, setScreen] = useState<Screen>("LOADING");
  const [device, setDevice] = useState<StoredDevice | null>(null);

  useEffect(() => {
    loadStoredDevice().then((stored) => {
      if (stored) {
        setDevice(stored);
        setScreen("ACCESS");
      } else {
        setScreen("PAIRING");
      }
    });
  }, []);

  if (screen === "LOADING") {
    return <div className="flex min-h-screen items-center justify-center bg-primary" />;
  }

  if (screen === "PAIRING") {
    return (
      <PairingScreen
        onLinked={(linkedDevice) => {
          void saveStoredDevice(linkedDevice);
          setDevice(linkedDevice);
          setScreen("LINKED_SUCCESS");
        }}
      />
    );
  }

  if (screen === "LINKED_SUCCESS" && device) {
    return <LinkedScreen device={device} onContinue={() => setScreen("ACCESS")} />;
  }

  if (screen === "ACCESS" && device) {
    return (
      <AccessScreen
        device={device}
        onRevoked={() => setScreen("REVOKED")}
        onUnlinked={() => {
          setDevice(null);
          setScreen("PAIRING");
        }}
      />
    );
  }

  if (screen === "REVOKED") {
    return (
      <RevokedScreen
        onRelink={() => {
          setDevice(null);
          setScreen("PAIRING");
        }}
      />
    );
  }

  return null;
}
