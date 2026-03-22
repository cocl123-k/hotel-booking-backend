import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatus } from '../bookings.entity';

export class UpdateBookingStatusDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(BookingStatus, { message: 'Trạng thái không hợp lệ' })
  status: BookingStatus;
}