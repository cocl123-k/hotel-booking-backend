import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID() @IsNotEmpty()
  hotelId: string;

  @IsUUID() @IsNotEmpty()
  roomTypeId: string;

  @IsString() @IsNotEmpty()
  checkIn: string;  

  @IsString() @IsNotEmpty()
  checkOut: string; 

  @IsString() @IsNotEmpty()
  guestName: string; 

  @IsString() @IsNotEmpty()
  guestPhone: string;

  @IsEmail() @IsOptional()
  guestEmail: string;
}