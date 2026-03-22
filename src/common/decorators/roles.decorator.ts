import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/users.entity'; // File chứa enum UserRole của bạn

export const ROLES_KEY = 'roles';

// Decorator này nhận vào một hoặc nhiều role (VD: PARTNER, ADMIN)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);