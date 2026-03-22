import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelStatus } from './hotels.entity';
import { UserRole } from '../users/users.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SearchHotelDto } from './dto/search-hotel.dto';

@Controller('api/hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  // api/hotels/search?city=...&checkIn=...&checkOut=...&rooms=...&guests=...
  @Get('search')
  searchHotels(
    @Query('location') location: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
    @Query('rooms') rooms: string,
    @Query('guests') guests: string,
  ) {
    const searchDto: SearchHotelDto = {
      location,
      checkIn,
      checkOut,
      rooms: parseInt(rooms) || 1,
      guests: parseInt(guests) || 2,
    };

    return this.hotelsService.searchAvailableHotels(searchDto);
  }

  // Đối tác tạo KS
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Lắp 2 lớp khóa
  @Roles(UserRole.PARTNER)
  create(@Body() createHotelDto: CreateHotelDto, @Req() req) {
    const PartnerId = req.user.id; // Đợi Auth sẽ lấy từ Token
    return this.hotelsService.create(PartnerId, createHotelDto);
  }

  @Get('info')
  @UseGuards(AuthGuard('jwt'))
  async getHotelsInfo(@Req() req) {
    const userId = req.user.id || req.user.sub; 
    
    return this.hotelsService.findHotelsByPartnerId(userId);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hotelsService.findOne(id);
  }
  
  // Admin xem danh sách KS cần duyệt
  @Get('admin')
  findAllForAdmin(@Query('status') status?: HotelStatus) {
    return this.hotelsService.findAllForAdmin(status);
  }

  // Admin duyệt / Đình chỉ hoặc Partner sửa tên
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard) 
  @Roles(UserRole.PARTNER, UserRole.ADMIN)
  update(
    @Param('id') id: string, 
    @Body() updateHotelDto: UpdateHotelDto,
    @CurrentUser() user: any
  ) {
    return this.hotelsService.update(id, updateHotelDto, user); 
  }
  // ==========================================
  // NÚT DUYỆT KHÁCH SẠN
  // ==========================================
  @Patch(':id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN) 
  approveHotel(@Param('id') id: string) {
    return this.hotelsService.approveHotel(id);
  }

  // ==========================================
  // NÚT TỪ CHỐI KHÁCH SẠN
  // ==========================================
  @Patch(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN) 
  rejectHotel(@Param('id') id: string) {
    return this.hotelsService.rejectHotel(id);
  }
}