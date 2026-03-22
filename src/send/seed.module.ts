import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../modules/users/users.entity';
import { Hotel } from '../modules/hotels/hotels.entity';
import { RoomType } from '../modules/room-types/room-types.entity';
import { Inventory } from '../modules/inventories/inventories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Hotel, RoomType, Inventory])],
  providers: [SeedService],
})
export class SeedModule {}