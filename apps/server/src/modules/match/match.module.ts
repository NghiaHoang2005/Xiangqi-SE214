import { Module } from '@nestjs/common';
import { MatchRepository } from './match.repository';

/** Match lifecycle: SubmitMove validation and commit, sync, result (US-20..US-22, US-25). */
@Module({ providers: [MatchRepository], exports: [MatchRepository] })
export class MatchModule {}
