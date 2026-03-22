import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../users.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsString({ message: 'Họ và tên phải là chuỗi văn bản' })
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên' })
  fullName: string;

  @IsString()
  @IsOptional() // Cho phép null hoặc không gửi lên
  phone?: string;
}