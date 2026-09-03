import * as gymRepository from "../repositories/gymRepository";
import { validateGymSettingsForm, hasValidationErrors } from "../domain/gymSettingsValidation";
import type { GymSettingsValidationErrors } from "../domain/gymSettingsValidation";
import type { GymSettings, GymSettingsFormInput } from "@/types/gym";
import type { GymSettingsRow } from "@/types/db";

export class GymSettingsValidationError extends Error {
  constructor(public errors: GymSettingsValidationErrors) {
    super("Los datos del gimnasio no son válidos.");
  }
}

function mapRowToSettings(row: GymSettingsRow): GymSettings {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    logoPath: row.logo_path,
  };
}

export async function getGymSettings(gymId: string): Promise<GymSettings | null> {
  const row = await gymRepository.findGymSettingsById(gymId);
  return row ? mapRowToSettings(row) : null;
}

export async function updateGymSettings(
  gymId: string,
  input: GymSettingsFormInput,
): Promise<void> {
  const errors = validateGymSettingsForm(input);
  if (hasValidationErrors(errors)) throw new GymSettingsValidationError(errors);

  await gymRepository.updateGymSettings(gymId, input);
}
