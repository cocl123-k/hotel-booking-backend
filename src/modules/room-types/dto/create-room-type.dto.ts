import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateRoomTypeDto {
  @IsUUID(4, { message: 'Mã khách sạn không hợp lệ' })
  @IsNotEmpty()
  hotelId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên hạng phòng' })
  name: string;

  @IsString()
  @IsNotEmpty()
  bedType: string;

  @IsNumber()
  @IsNotEmpty()
  maxGuests: number;

  @IsNumber()
  @IsNotEmpty()
  defaultPrice: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}