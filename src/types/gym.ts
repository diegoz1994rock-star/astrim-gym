export interface GymSettingsFormInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  logoPath: string | null;
}

export interface GymSettings {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  logoPath: string | null;
}

export function gymSettingsToFormInput(settings: GymSettings): GymSettingsFormInput {
  return {
    name: settings.name,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    logoPath: settings.logoPath,
  };
}
