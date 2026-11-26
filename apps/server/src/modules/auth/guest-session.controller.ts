import { Body, Controller, Get, Headers, HttpStatus, Patch, Post, Res } from '@nestjs/common';
import { GUEST_SESSION_COOKIE, type GuestSessionView } from '@xiangqi/shared';
import type { Response } from 'express';
import {
  GUEST_SESSION_TTL_MS,
  GuestSessionService,
  readGuestSessionToken,
} from './guest-session.service';

function setSessionCookie(response: Response, token: string): void {
  response.cookie(GUEST_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: GUEST_SESSION_TTL_MS,
  });
}

@Controller('guest-session')
export class GuestSessionController {
  constructor(private readonly sessions: GuestSessionService) {}

  @Post()
  async create(
    @Headers('cookie') cookies: string | undefined,
    @Body('nickname') nickname: unknown,
    @Res() response: Response,
  ): Promise<void> {
    const { session, token, created } = await this.sessions.createOrReuse(
      readGuestSessionToken(cookies),
      nickname,
    );
    setSessionCookie(response, token);
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK).json(session);
  }

  @Get('me')
  async get(
    @Headers('cookie') cookies: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GuestSessionView> {
    const token = readGuestSessionToken(cookies);
    const session = await this.sessions.require(token);
    if (token) setSessionCookie(response, token);
    return session;
  }

  @Patch('me')
  async update(
    @Headers('cookie') cookies: string | undefined,
    @Body('nickname') nickname: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GuestSessionView> {
    const token = readGuestSessionToken(cookies);
    const session = await this.sessions.updateNickname(token, nickname);
    if (token) setSessionCookie(response, token);
    return session;
  }
}
