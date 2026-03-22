import { IsString, IsNotEmpty, IsNumber, IsDateString, Min } from 'class-validator';

export class BulkUpdateInventoryDto {
  @IsString() @IsNotEmpty()
  roomTypeId: string;

  @IsDateString() @IsNotEmpty()
  startDate: string; // VD: '2026-04-01'

  @IsDateString() @IsNotEmpty()
  endDate: string;   // VD: '2026-04-30'

  @IsNumber() @Min(0)
  allottedCount: number; // Cấp 5 phòng

  @IsNumber() @Min(0)
  price: number;     // Giá bán
}