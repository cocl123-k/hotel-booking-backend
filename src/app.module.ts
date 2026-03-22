import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Hotel } from './modules/hotels/hotels.entity';
import { User } from './modules/users/users.entity';
import { RoomType } from './modules/room-types/room-types.entity';
import { Booking } from './modules/bookings/bookings.entity';
import { Inventory } from './modules/inventories/inventories.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { InventoriesModule } from './modules/inventories/inventories.module';
import { ConfigModule } from '@nestjs/config';
import { SeedModule } from './send/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'password123',
      database: 'stayease_db',
      entities: [Hotel, User, RoomType, Booking, Inventory],
      synchronize: true, // Đặt thành true để tự động tạo bảng
    }),
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    AuthModule,
    UsersModule,
    HotelsModule,
    RoomTypesModule,
    BookingsModule,
    InventoriesModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}