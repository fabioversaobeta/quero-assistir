import type { AuthClaims, GoogleProfile, User } from './identity';
import type { UserRole } from '@quero-assistir/contracts';

export abstract class UserRepository {
  abstract upsertFromGoogle(profile: GoogleProfile, role: UserRole): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  /** Remove o usuário e, em cascata, todas as suas decisões (direito ao esquecimento). */
  abstract deleteById(id: string): Promise<void>;
}

/** Valida o idToken emitido pelo Google e devolve o perfil. Lança UnauthorizedError se inválido. */
export abstract class GoogleIdentityVerifier {
  abstract verify(idToken: string): Promise<GoogleProfile>;
}

export abstract class TokenService {
  abstract issue(user: User): Promise<{ accessToken: string; expiresInSeconds: number }>;
  /** Devolve null se o token for inválido ou expirado. */
  abstract verify(token: string): Promise<AuthClaims | null>;
}
