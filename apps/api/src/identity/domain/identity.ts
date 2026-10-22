import type { UserRole } from '@quero-assistir/contracts';

export interface User {
  id: string;
  googleSub: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;
}

/** Perfil validado vindo do Google. */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
}

export interface AuthClaims {
  userId: string;
  role: UserRole;
}

/** Política de papéis: administradores são definidos por allowlist de e-mails na configuração. */
export function resolveRole(email: string, adminEmails: readonly string[]): UserRole {
  return adminEmails.includes(email.toLowerCase()) ? 'ADMIN' : 'USER';
}
