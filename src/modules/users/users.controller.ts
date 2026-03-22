import { Controller, Get, Post, Body, Patch, Param, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from './users.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admin/pending-partners')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingPartners() {
    return this.usersService.getPendingPartners();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role);
  }

  // API Xem thông tin tài khoản (Profile)
  @Get(':id')
  @UseGuards(AuthGuard('jwt')) // Bắt buộc đăng nhập
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Chặn: Nếu ID trên URL khác với ID trong Token VÀ không phải Admin
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin người khác!');
    }
    return this.usersService.findOne(id);
  }
  // API Cập nhật thông tin (Tên, Số điện thoại)
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any
  ) {
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền sửa thông tin người khác!');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/approve-partner')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Lắp bảo vệ
  @Roles(UserRole.ADMIN)                   // CHỈ CÓ ADMIN MỚI ĐƯỢC BẤM NÚT NÀY
  approvePartner(@Param('id') id: string) {
    return this.usersService.approvePartner(id);
  }

  @Patch(':id/reject-partner')
  @UseGuards(AuthGuard('jwt'), RolesGuard) 
  @Roles(UserRole.ADMIN)                   // CHỈ ADMIN MỚI ĐƯỢC TỪ CHỐI
  rejectPartner(@Param('id') id: string) {
    return this.usersService.rejectPartner(id);
  }

  
}