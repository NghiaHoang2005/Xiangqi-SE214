import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** PostgreSQL access for every feature module; imported once in AppModule. */
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class DatabaseModule {}
