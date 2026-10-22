import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Config } from '../config/app-config';
import {
  AuthenticateWithGoogleUseCase,
  DeleteAccountUseCase,
  GetCurrentUserUseCase,
} from './application/identity-use-cases';
import { GoogleIdentityVerifier, TokenService, UserRepository } from './domain/ports';
import {
  GoogleAuthLibraryVerifier,
  JwtTokenService,
  PrismaUserRepository,
} from './infrastructure/identity-adapters';
import { AdminGuard, JwtAuthGuard, OptionalJwtAuthGuard } from './presentation/auth.guards';
import { IdentityController } from './presentation/identity.controller';

/** Global: os guards de autenticação são usados por todos os contextos. */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [Config],
      useFactory: (config: Config) => ({ secret: config.jwtSecret }),
    }),
  ],
  controllers: [IdentityController],
  providers: [
    AuthenticateWithGoogleUseCase,
    GetCurrentUserUseCase,
    DeleteAccountUseCase,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    AdminGuard,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: GoogleIdentityVerifier, useClass: GoogleAuthLibraryVerifier },
    { provide: TokenService, useClass: JwtTokenService },
  ],
  exports: [TokenService, UserRepository, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard],
})
export class IdentityModule {}
