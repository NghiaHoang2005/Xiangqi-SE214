import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './options';

/**
 * PostgreSQL connection (CFG-09). Feature modules register the repositories they need with
 * `TypeOrmModule.forFeature([Room, RoomSeat])`.
 */
@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions() })],
})
export class DatabaseModule {}
