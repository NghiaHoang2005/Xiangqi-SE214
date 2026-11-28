import { Module } from '@nestjs/common';
import { GuestSessionController } from './guest-session.controller';
import { GuestSessionService } from './guest-session.service';

/** Guest sessions and accounts: register, login, tokens (US-11, US-37..US-40). */
@Module({
  controllers: [GuestSessionController],
  providers: [GuestSessionService],
  exports: [GuestSessionService],
})
export class AuthModule {}
