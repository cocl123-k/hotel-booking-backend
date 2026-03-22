import { Controller, Get, Body, Patch, Param, Query, UseGuards, Post, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { BookingStatus } from './bookings.entity';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '../users/users.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('api/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('client/book')
  @UseGuards(AuthGuard('jwt'))
  createBooking(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user?: any
  ) {
    const userId = user?.id || null;
    return this.bookingsService.createClientBooking(userId, createBookingDto);
  }

  @Get('client/lookup')
  lookupByEmail(@Query('email') email: string) {
    if (!email) throw new BadRequestException('Vui lòng cung cấp email để tra cứu!');
    return this.bookingsService.findByEmailForClient(email);
  }

  @Patch('client/bookings/:id/cancel')
  @UseGuards(AuthGuard('jwt')) // Bắt buộc khách phải đăng nhập mới được hủy
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.bookingsService.cancelClientBooking(id, user.id);
  }

  @Get('client/bookings')
  @UseGuards(AuthGuard('jwt'))
  getMyBookings(@CurrentUser() user: any) {
    // Gọi hàm tìm kiếm theo user.id (Bạn có thể viết thêm 1 hàm nhỏ findAllForClient trong Service nhé)
    return this.bookingsService.findAllForClient(user.id);
  }

  // Route: GET /api/bookings?page=1&limit=10&status=PENDING
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  findAll(
    @CurrentUser() user: any,
    @Query('hotelId') hotelId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: BookingStatus,
    @Query('search') search?: string, // <-- 1. THÊM THAM SỐ TÌM KIẾM
  ) {
    const partnerId = user.id || user.sub;

    if (!hotelId) {
      throw new BadRequestException('Vui lòng cung cấp mã khách sạn (hotelId)');
    }

    return this.bookingsService.findAllForPartner(
      partnerId,
      hotelId,
      parseInt(page),
      parseInt(limit),
      status,
      search, // <-- 2. TRUYỀN XUỐNG SERVICE
    );
  }

  // Route: GET /api/bookings/:id
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const partnerId = user.id || user.sub; // Lấy ID của đối tác
    return this.bookingsService.findOneForPartner(id, partnerId);
  }

  // Route: PATCH /api/bookings/:id/status
@Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PARTNER)
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingStatusDto,
    @CurrentUser() user: any
  ) {
    // SỬA Ở ĐÂY: Dùng partnerId thay vì user.hotelIds
    const partnerId = user.id || user.sub; 
    return this.bookingsService.updateStatus(id, partnerId, updateDto.status);
  }
}