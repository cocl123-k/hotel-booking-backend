import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Tránh việc user tự ý đổi email hoặc role (chỉ Admin mới được đổi)
export class UpdateUserDto extends PartialType(CreateUserDto) {
  fullName?: string;
  phone?: string;
  // Lưu ý: Không đưa password hay role vào đây. Mật khẩu nên có API đổi riêng.
}