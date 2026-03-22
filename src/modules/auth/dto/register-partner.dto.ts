import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterPartnerDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsString({ message: 'Họ và tên hoặc Tên doanh nghiệp phải là chuỗi văn bản' })
  @IsNotEmpty({ message: 'Vui lòng nhập Họ tên / Tên doanh nghiệp' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại là bắt buộc để Admin liên hệ xác minh' })
  phone: string; 
}