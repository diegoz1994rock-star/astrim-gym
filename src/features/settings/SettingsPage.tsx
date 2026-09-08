import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Image, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as gymService from "@/lib/services/gymService";
import { GymSettingsValidationError } from "@/lib/services/gymService";
import { pickPersonPhoto } from "@/lib/services/photoService";
import { validateGymSettingsForm } from "@/lib/domain/gymSettingsValidation";
import type { GymSettingsValidationErrors } from "@/lib/domain/gymSettingsValidation";
import { gymSettingsToFormInput, type GymSettingsFormInput } from "@/types/gym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/Avatar";
import { DevicesTab } from "./DevicesTab";
import { CloudTab } from "./CloudTab";
import { ChangePasswordCard } from "./ChangePasswordCard";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

type SettingsTab = "general" | "devices" | "cloud";

export function SettingsPage() {
  const { user, refreshGymName, refreshGymLogo } = useAuth();
  const gymId = user?.gymId ?? null;
  const [tab, setTab] = useState<SettingsTab>("general");

  const [form, setForm] = useState<GymSettingsFormInput | null>(null);
  const [initialForm, setInitialForm] = useState<GymSettingsFormInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<GymSettingsValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const settings = await gymService.getGymSettings(gymId);
      if (!settings) {
        setError("No se encontró la configuración de este gimnasio.");
        return;
      }
      const input = gymSettingsToFormInput(settings);
      setForm(input);
      setInitialForm(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Aviso del navegador si se cierra la ventana con cambios sin guardar.
  // No bloquea la navegación interna de la app (requeriría un router de
  // datos que este proyecto no usa); ver docs/DECISIONS.md.
  useEffect(() => {
    const isDirty = form && initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form, initialForm]);

  const isDirty = Boolean(
    form && initialForm && JSON.stringify(form) !== JSON.stringify(initialForm),
  );

  function update<K extends keyof GymSettingsFormInput>(key: K, value: GymSettingsFormInput[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSavedMessage(false);
  }

  async function handlePickLogo() {
    const path = await pickPersonPhoto();
    if (path) update("logoPath", path);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gymId || !form) return;
    setError(null);
    setSavedMessage(false);

    const fieldErrors = validateGymSettingsForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await gymService.updateGymSettings(gymId, form);
      setInitialForm(form);
      setErrors({});
      setSavedMessage(true);
      refreshGymName(form.name.trim());
      refreshGymLogo(form.logoPath);
    } catch (err) {
      if (err instanceof GymSettingsValidationError) {
        setErrors(err.errors);
      } else {
        setError(err instanceof Error ? err.message : "Error al guardar la configuración.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Configuración</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra la información y las preferencias generales de tu gimnasio.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "general" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setTab("devices")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "devices" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Dispositivos
        </button>
        <button
          type="button"
          onClick={() => setTab("cloud")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "cloud" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Nube
        </button>
      </div>

      {tab === "devices" && gymId && <DevicesTab gymId={gymId} />}
      {tab === "cloud" && gymId && <CloudTab gymId={gymId} />}

      {tab === "general" && loading && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Cargando configuración...
          </CardContent>
        </Card>
      )}

      {tab === "general" && !loading && error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {tab === "general" && !loading && !error && form && (
        <>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del gimnasio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={form.name || "?"} photoPath={form.logoPath} className="h-16 w-16 text-lg" />
                <Button type="button" variant="secondary" size="sm" onClick={handlePickLogo}>
                  <Image className="h-4 w-4" />
                  {form.logoPath ? "Cambiar logo" : "Seleccionar logo"}
                </Button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Nombre del gimnasio *
                </label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
                <FieldError message={errors.name} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Teléfono
                  </label>
                  <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                  <FieldError message={errors.phone} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Correo electrónico
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                  <FieldError message={errors.email} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Dirección
                  </label>
                  <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
                  <FieldError message={errors.address} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Ciudad</label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                  <FieldError message={errors.city} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {isDirty && !savedMessage && (
                <span className="text-warning">Tienes cambios sin guardar.</span>
              )}
              {savedMessage && (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Guardado correctamente.
                </span>
              )}
            </div>
            <Button type="submit" disabled={saving || !isDirty} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>

        <ChangePasswordCard />
        </>
      )}
    </div>
  );
}
