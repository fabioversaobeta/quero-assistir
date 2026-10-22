import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@quero-assistir/contracts';
import { OAuth2Client } from 'google-auth-library';
import { Config } from '../../config/app-config';
import { UnauthorizedError } from '../../shared/domain-error';
import { PrismaService } from '../../shared/prisma.service';
import type { AuthClaims, GoogleProfile, User } from '../domain/identity';
import { GoogleIdentityVerifier, TokenService, UserRepository } from '../domain/ports';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  upsertFromGoogle(profile: GoogleProfile, role: UserRole): Promise<User> {
    const data = {
      email: profile.email.toLowerCase(),
      name: profile.name,
      pictureUrl: profile.pictureUrl,
      role,
      lastLoginAt: new Date(),
    };
    return this.prisma.user.upsert({
      where: { googleSub: profile.sub },
      create: { googleSub: profile.sub, ...data },
      update: data,
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.user.deleteMany({ where: { id } });
  }
}

@Injectable()
export class GoogleAuthLibraryVerifier extends GoogleIdentityVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: Config) {
    super();
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    if (this.config.googleClientIds.length === 0) {
      throw new UnauthorizedError('Login com Google não configurado (GOOGLE_CLIENT_IDS)');
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.googleClientIds,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified === false) {
        throw new UnauthorizedError('Conta Google sem e-mail verificado');
      }
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        pictureUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError('Token do Google inválido');
    }
  }
}

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: Config,
  ) {
    super();
  }

  async issue(user: User) {
    const expiresInSeconds = this.config.jwtExpiresInSeconds;
    const accessToken = await this.jwt.signAsync(
      { role: user.role },
      { subject: user.id, expiresIn: expiresInSeconds },
    );
    return { accessToken, expiresInSeconds };
  }

  async verify(token: string): Promise<AuthClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: UserRole }>(token);
      return { userId: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }
}
