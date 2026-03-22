import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './bookings.entity'; // File entity bạn đã tạo

@Module({
  imports: [TypeOrmModule.forFeature([Booking])], // Đăng ký Entity ở đây
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}