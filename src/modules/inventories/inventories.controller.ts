import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/users.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoriesService } from './inventories.service';
import { BulkUpdateInventoryDto } from './dto/bulk-update-inventory.dto';

@Controller('api/inventories')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  // ==========================================
  // 1. PUBLIC: Khách hàng kiểm tra phòng trống
  // ==========================================
  @Get('check-availability')
  checkAvailability(
    @Query('roomTypeId') roomTypeId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.inventoriesService.checkAvailability(roomTypeId, checkIn, checkOut);
  }

  // ==========================================
  // 2. PARTNER: Cập nhật quỹ phòng hàng loạt
  // ==========================================
  @Post('bulk-update')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  bulkUpdate(
    @Body() bulkDto: BulkUpdateInventoryDto, 
    @CurrentUser() user: any
  ) {
    const partnerId = user.id || user.sub; // Lấy ID chuẩn xác từ Token
    return this.inventoriesService.bulkUpdate(partnerId, bulkDto);
  }
}