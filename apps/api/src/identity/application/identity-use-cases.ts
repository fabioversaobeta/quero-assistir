import { Injectable } from '@nestjs/common';
import { Config } from '../../config/app-config';
import { NotFoundError } from '../../shared/domain-error';
import { resolveRole, type User } from '../domain/identity';
import { GoogleIdentityVerifier, TokenService, UserRepository } from '../domain/ports';

export interface AuthenticationResult {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}

@Injectable()
export class AuthenticateWithGoogleUseCase {
  constructor(
    private readonly google: GoogleIdentityVerifier,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly config: Config,
  ) {}

  async execute(idToken: string): Promise<AuthenticationResult> {
    const profile = await this.google.verify(idToken);
    const role = resolveRole(profile.email, this.config.adminEmails);
    const user = await this.users.upsertFromGoogle(profile, role);
    const token = await this.tokens.issue(user);
    return { ...token, user };
  }
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Usuário');
    return user;
  }
}

@Injectable()
export class DeleteAccountUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<void> {
    await this.users.deleteById(userId);
  }
}
