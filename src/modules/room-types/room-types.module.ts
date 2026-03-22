import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomTypesService } from './room-types.service';
import { RoomTypesController } from './room-types.controller';
import { RoomType } from './room-types.entity'; // Import bảng CSDL

@Module({
  imports: [TypeOrmModule.forFeature([RoomType])], 
  controllers: [RoomTypesController],
  providers: [RoomTypesService]
})
export class RoomTypesModule {}