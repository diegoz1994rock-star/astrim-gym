export type UserRole = "SUPERADMIN" | "ADMIN" | "TRAINER" | "CLIENT";

export interface AuthUser {
  id: string;
  gymId: string | null;
  gymName: string | null;
  gymLogoPath: string | null;
  name: string;
  email: string;
  role: UserRole;
}
