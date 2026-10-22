import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, UserDto } from '@quero-assistir/contracts';
import { IsString, MinLength } from 'class-validator';
import {
  AuthenticateWithGoogleUseCase,
  DeleteAccountUseCase,
  GetCurrentUserUseCase,
} from '../application/identity-use-cases';
import type { AuthClaims, User } from '../domain/identity';
import { CurrentAuth, JwtAuthGuard } from './auth.guards';

class GoogleLoginBody {
  @IsString()
  @MinLength(20)
  idToken!: string;
}

export const toUserDto = (u: User): UserDto => ({
  id: u.id,
  email: u.email,
  name: u.name,
  pictureUrl: u.pictureUrl,
  role: u.role,
});

@ApiTags('auth')
@Controller('v1')
export class IdentityController {
  constructor(
    private readonly authenticate: AuthenticateWithGoogleUseCase,
    private readonly getMe: GetCurrentUserUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
  ) {}

  /** Troca o idToken do Google por um JWT da API. */
  @Post('auth/google')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async loginWithGoogle(@Body() body: GoogleLoginBody): Promise<AuthResponse> {
    const result = await this.authenticate.execute(body.idToken);
    return {
      accessToken: result.accessToken,
      expiresInSeconds: result.expiresInSeconds,
      user: toUserDto(result.user),
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentAuth() auth: AuthClaims): Promise<UserDto> {
    return toUserDto(await this.getMe.execute(auth.userId));
  }

  /** Exclusão de conta e de todos os dados do usuário (exigência das lojas e da LGPD). */
  @Delete('me')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteMe(@CurrentAuth() auth: AuthClaims): Promise<void> {
    await this.deleteAccount.execute(auth.userId);
  }
}
