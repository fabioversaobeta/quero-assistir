import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/domain-error';
import type { AuthClaims } from '../domain/identity';
import { TokenService, UserRepository } from '../domain/ports';

type AuthedRequest = Request & { auth?: AuthClaims };

async function readClaims(req: AuthedRequest, tokens: TokenService): Promise<AuthClaims | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return tokens.verify(header.slice('Bearer '.length));
}

/** Exige JWT válido. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const claims = await readClaims(req, this.tokens);
    if (!claims) throw new UnauthorizedError();
    req.auth = claims;
    return true;
  }
}

/** Aceita requisições anônimas; se houver JWT válido, popula `req.auth`. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const claims = await readClaims(req, this.tokens);
    if (claims) req.auth = claims;
    return true;
  }
}

/** Exige JWT válido e papel ADMIN confirmado no banco (revogação imediata ao sair da allowlist). */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const claims = await readClaims(req, this.tokens);
    if (!claims) throw new UnauthorizedError();
    const user = await this.users.findById(claims.userId);
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    req.auth = { userId: user.id, role: user.role };
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthClaims | undefined =>
    context.switchToHttp().getRequest<AuthedRequest>().auth,
);
