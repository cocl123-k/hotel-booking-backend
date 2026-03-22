import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/users.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Đọc xem API này đang yêu cầu những Role nào
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API không dán nhãn @Roles, nghĩa là ai đã đăng nhập cũng vào được
    if (!requiredRoles) {
      return true;
    }

    // 2. Lấy thông tin user từ Request (đã được AuthGuard giải mã trước đó)
    const { user } = context.switchToHttp().getRequest();

    // 3. Kiểm tra: User có tồn tại không? Role của họ có nằm trong danh sách cho phép không?
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập. Yêu cầu tài khoản Đối tác (Partner)!');
    }

    return true; // Cho phép đi tiếp vào Controller
  }
}