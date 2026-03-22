import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { Hotel } from './hotels.entity';
import { RoomType } from '../room-types/room-types.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hotel]), TypeOrmModule.forFeature([RoomType])],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}