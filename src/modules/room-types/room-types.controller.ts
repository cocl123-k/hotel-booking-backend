import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/users.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { RoomTypesService } from './room-types.service';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
// ... import service và DTO

@Controller('api/room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  // ================= PUBLIC =================
  @Get('active') // Đổi route một chút cho rõ ràng: /api/room-types/active?hotelId=...
  findActive(@Query('hotelId') hotelId: string) {
    if (!hotelId) throw new BadRequestException('Vui lòng cung cấp mã khách sạn!');
    return this.roomTypesService.findActiveByHotel(hotelId); 
  }

  // ================= PARTNER ONLY =================
  @Get('manage') 
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  findAllForManagement(
    @Query('hotelId') hotelId: string, 
    @CurrentUser() user: any
  ) {
    if (!hotelId) throw new BadRequestException('Vui lòng cung cấp mã khách sạn!');
    const partnerId = user.id || user.sub; 
    return this.roomTypesService.findAllForPartner(hotelId, partnerId);
  }
  
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  create(@Body() createRoomTypeDto: CreateRoomTypeDto, @CurrentUser() user: any) {
    const partnerId = user.id || user.sub; 
    return this.roomTypesService.create(partnerId, createRoomTypeDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  update(@Param('id') id: string, @Body() updateDto: UpdateRoomTypeDto, @CurrentUser() user: any) {
    const partnerId = user.id || user.sub; 
    return this.roomTypesService.update(id, partnerId, updateDto); 
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const partnerId = user.id || user.sub; 
    return this.roomTypesService.remove(id, partnerId);
  }
}