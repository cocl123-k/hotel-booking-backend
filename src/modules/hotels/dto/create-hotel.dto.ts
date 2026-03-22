import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreateHotelDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsString() @IsNotEmpty()
  address: string;

  @IsString() @IsNotEmpty()
  city: string;

  @IsString() @IsNotEmpty()
  taxId: string;

  @IsString()
  description: string;

  @IsNumber() @Min(1) @Max(5)
  starRating: number;
}