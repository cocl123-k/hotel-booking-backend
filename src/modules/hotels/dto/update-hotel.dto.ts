import { PartialType } from '@nestjs/mapped-types';
import { CreateHotelDto } from './create-hotel.dto';
import { HotelStatus } from '../hotels.entity';

export class UpdateHotelDto extends PartialType(CreateHotelDto) {
  status?: HotelStatus; // Chỉ dành cho Admin duyệt
  commissionRate?: number; // Chỉ Admin mới được set % hoa hồng
}