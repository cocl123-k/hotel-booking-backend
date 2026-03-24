import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Tránh việc user tự ý đổi email hoặc role (chỉ Admin mới được đổi)
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['email', 'password'] as const)) {}