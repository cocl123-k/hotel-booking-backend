import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';
import { Inventory } from './inventories.entity';
import { RoomType } from '../room-types/room-types.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Inventory, RoomType])],
  controllers: [InventoriesController],
  providers: [InventoriesService],
})
export class InventoriesModule {}