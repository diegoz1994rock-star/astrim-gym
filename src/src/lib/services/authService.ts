import bcrypt from "bcryptjs";
import { findUserByEmail, touchLastLogin } from "../repositories/authRepository";
import { findGymById } from "../repositories/gymRepository";
import type { AuthUser } from "@/types/auth";

export class InvalidCredentialsError extends Error {}
export class AccountInactiveError extends Error {}
export class GymSuspendedError extends Error {}

export async function login(email: string, password: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new InvalidCredentialsError("Correo o contraseña incorrectos.");
  }

  if (user.status !== "ACTIVE") {
    throw new AccountInactiveError("Esta cuenta está inactiva. Contacta al administrador.");
  }

  // El SUPERADMIN no pertenece a ningún gimnasio; todos los demás roles
  // quedan bloqueados si la licencia del gimnasio no está activa.
  let gymName: string | null = null;
  let gymLogoPath: string | null = null;
  if (user.gym_id) {
    const gym = await findGymById(user.gym_id);
    if (!gym || gym.license_status === "SUSPENDED" || gym.license_status === "CANCELLED") {
      throw new GymSuspendedError(
        "El acceso de este gimnasio está suspendido. Contacta al soporte de ASTRIM GYM.",
      );
    }
    gymName = gym.name;
    gymLogoPath = gym.logo_path;
  }

  await touchLastLogin(user.id);

  return {
    id: user.id,
    gymId: user.gym_id,
    gymName,
    gymLogoPath,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
