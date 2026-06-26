/** Mirrors the backend auth DTOs (`AuthDtos`). */

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface UserProfile {
  id: number;
  email: string;
  displayName?: string | null;
  role: UserRole;
  organizationId: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: UserProfile | null;
}
