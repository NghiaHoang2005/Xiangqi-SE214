import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * The Prisma client as a Nest provider. Inject it in services:
 *   constructor(private readonly db: PrismaService) {}
 *   this.db.room.findUnique({ where: { joinCode } })
 * Connection settings come from DATABASE_URL (CFG-09).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
