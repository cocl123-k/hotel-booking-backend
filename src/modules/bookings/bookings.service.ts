import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Booking, BookingStatus } from './bookings.entity';
import { Inventory } from '../inventories/inventories.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. API: Lấy danh sách có phân trang và Lọc
  async findAllForPartner(partnerId: string, hotelId: string, page: number = 1, limit: number = 10, status?: BookingStatus, search?: string) {
    
    const skip = (page - 1) * limit;

    const query = this.bookingRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.roomType', 'roomType')
      .innerJoin('booking.hotel', 'hotel')     
      .innerJoin('hotel.partner', 'partner')   
      .where('hotel.id = :hotelId', { hotelId }) 
      .andWhere('partner.id = :partnerId', { partnerId });

    // ==========================================
    // LOGIC TÌM KIẾM ĐA TRƯỜNG (Tên, SĐT, Email, ID)
    // ==========================================
    if (search) {
      query.andWhere(
        '(LOWER(booking.guestName) LIKE LOWER(:search) OR booking.guestPhone LIKE :search OR LOWER(booking.guestEmail) LIKE LOWER(:search) OR CAST(booking.id AS text) LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Lọc theo trạng thái đơn
    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    query.orderBy('booking.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit) || 1,
        currentPage: page,
      },
    };
  }

  // 2. API: Lấy chi tiết 1 đơn đặt phòng
  async findOne(id: string, hotelIds: string[]) {
    const booking = await this.bookingRepository.findOne({
      where: { id, hotel: { id: In(hotelIds) } }, // Kiểm tra đơn này có thuộc về khách sạn của Partner không
      relations: ['roomType', 'guest'], // Lấy thông tin phòng và người đặt
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt phòng có mã ${id}`);
    }

    return booking;
  }

  // 2. API: Lấy chi tiết 1 đơn đặt phòng (Bảo mật với partnerId)
  async findOneForPartner(id: string, partnerId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { 
        id, 
        hotel: { partner: { id: partnerId } } // Khóa bảo mật IDOR
      }, 
      relations: ['roomType', 'guest', 'hotel'], 
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt phòng có mã ${id} hoặc bạn không có quyền xem!`);
    }

    return booking;
  }

  // 3. API: Đối tác cập nhật trạng thái đơn (Xác nhận/Hủy/No-show)
  async updateStatus(id: string, partnerId: string, status: BookingStatus) {
    // 1. Tìm đơn hàng trước xem có tồn tại và đúng của khách sạn này không
    const booking = await this.findOneForPartner(id, partnerId);
    
    // 2. Chặn: Nếu đơn đã chốt (Hủy, Không đến, Hoàn thành) thì không cho đổi qua lại nữa
    if (['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(booking.status)) {
       throw new BadRequestException('Đơn hàng đã chốt trạng thái, không thể thay đổi!');
    }

    // ==========================================
    // 3. NẾU ĐỐI TÁC HỦY HOẶC KHÁCH KHÔNG ĐẾN -> HOÀN TRẢ PHÒNG
    // ==========================================
    if (status === BookingStatus.CANCELLED || status === BookingStatus.NO_SHOW) {
      return await this.dataSource.transaction(async (manager) => {
        // Cập nhật trạng thái
        booking.status = status;
        booking.updatedAt = new Date();
        await manager.save(booking);

        // Tìm và trừ lại quỹ phòng
        const inventories = await manager.createQueryBuilder(Inventory, 'inv')
          .where('inv.roomTypeId = :roomTypeId', { roomTypeId: booking.roomType.id })
          .andWhere('inv.date >= :checkIn AND inv.date < :checkOut', { 
            checkIn: booking.checkInDate, 
            checkOut: booking.checkOutDate 
          })
          .setLock('pessimistic_write') // Khóa dòng chống đụng độ
          .getMany();

        for (const inv of inventories) {
          if (inv.bookedCount > 0) {
            inv.bookedCount -= 1;
            await manager.save(inv);
          }
        }
        
        return booking;
      });
    }

    // ==========================================
    // 4. NẾU DUYỆT (CONFIRMED, CHECKED_IN, COMPLETED)
    // ==========================================
    booking.status = status;
    booking.updatedAt = new Date();
    return await this.bookingRepository.save(booking);
  }

  async findAllForClient(userId: string) {
    return await this.bookingRepository.find({
      // Chỉ tìm những đơn hàng mà guest.id trùng với ID của người đang đăng nhập
      where: { guest: { id: userId } },
      
      // JOIN bảng: Khách hàng chắc chắn muốn biết họ đã đặt Khách sạn nào và Hạng phòng gì
      relations: ['hotel', 'roomType'], 
      
      // Sắp xếp: Đơn hàng mới nhất lên đầu (Giống hệt các app Shopee, Traveloka)
      order: { createdAt: 'DESC' },
    });
  }

  async createClientBooking(userId: string, dto: CreateBookingDto) {
    const { hotelId, roomTypeId, checkIn, checkOut, guestName, guestPhone, guestEmail } = dto;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));

    if (nights <= 0) throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng!');

    // BẮT ĐẦU TRANSACTION: Mọi thao tác Database trong này, nếu lỗi 1 bước sẽ HỦY TOÀN BỘ (Rollback)
    return await this.dataSource.transaction(async (manager) => {
      const inventories = await manager.createQueryBuilder(Inventory, 'inv')
        .where('inv.roomType = :roomTypeId', { roomTypeId })
        .andWhere('inv.date >= :checkIn AND inv.date < :checkOut', { checkIn, checkOut })
        .setLock('pessimistic_write') // <-- PHÉP THUẬT CHỐNG OVERBOOKING NẰM Ở ĐÂY!
        .getMany();

      // 2. Kiểm tra xem đối tác có cấu hình đủ ngày không
      if (inventories.length !== nights) {
        throw new BadRequestException('Khách sạn chưa mở bán đủ số ngày bạn chọn!');
      }

      // 3. Kiểm tra xem TẤT CẢ các ngày có còn phòng trống không và tính tổng tiền
      let totalPrice = 0;
      for (const inv of inventories) {
        if (inv.bookedCount >= inv.allottedCount) {
          throw new BadRequestException(`Rất tiếc, ngày ${inv.date} đã hết phòng!`);
        }
        totalPrice += Number(inv.price);
      }

      for (const inv of inventories) {
        inv.bookedCount += 1;
        await manager.save(inv); // Lưu lại vào DB
      }

      // 5. Tạo đơn hàng mới
      const platformFee = totalPrice * 0.05; // Mặc định thu 5% hoa hồng nền tảng
      const payoutAmount = totalPrice - platformFee; // Tiền khách sạn thực nhận

      const newBooking = manager.create(Booking, {
        hotel: { id: hotelId },
        roomType: { id: roomTypeId },
        ...(userId ? { guest: { id: userId } } : {}), 
        guestName,
        guestPhone,
        guestEmail,
        
        // ĐÃ SỬA: Map đúng tên cột trong Entity
        checkInDate: checkInDate,   
        checkOutDate: checkOutDate, 
        nights: nights,             
        totalAmount: totalPrice,    
        platformFee: platformFee,   
        payoutAmount: payoutAmount, 
        
        status: BookingStatus.PENDING, 
      });

      // Lưu đơn hàng và kết thúc Transaction thành công!
      return await manager.save(newBooking);
    });
  }

  // =======================================================
  // CLIENT API: KHÁCH HÀNG TỰ HỦY PHÒNG (HOÀN TRẢ QUỸ PHÒNG)
  // =======================================================
  async cancelClientBooking(id: string, userId: string) {
    // Lại dùng Transaction để đảm bảo tính toàn vẹn dữ liệu
    return await this.dataSource.transaction(async (manager) => {
      
      // 1. Tìm đơn hàng, bắt buộc phải thuộc về khách hàng đang đăng nhập
      const booking = await manager.findOne(Booking, {
        where: { id: id, guest: { id: userId } },
        relations: ['roomType'], // Phải join bảng này để lấy roomTypeId đi tìm Inventory
      });

      if (!booking) {
        throw new NotFoundException('Không tìm thấy đơn đặt phòng của bạn!');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Đơn hàng này đã được hủy trước đó!');
      }

      // (Tùy chọn nghiệp vụ): Chỉ cho hủy nếu ngày check-in chưa diễn ra
      if (new Date() >= new Date(booking.checkInDate)) {
        throw new BadRequestException('Không thể hủy vì đã quá hạn (đã đến ngày nhận phòng)!');
      }

      // 2. Đổi trạng thái đơn hàng thành ĐÃ HỦY
      booking.status = BookingStatus.CANCELLED;
      await manager.save(booking);

      // 3. TÌM VÀ HOÀN TRẢ QUỸ PHÒNG (INVENTORY)
      const inventories = await manager.createQueryBuilder(Inventory, 'inv')
        .where('inv.roomTypeId = :roomTypeId', { roomTypeId: booking.roomType.id })
        .andWhere('inv.date >= :checkIn AND inv.date < :checkOut', { 
          checkIn: booking.checkInDate, 
          checkOut: booking.checkOutDate 
        })
        .setLock('pessimistic_write') // Tiếp tục khóa lại để tránh đụng độ lúc hoàn trả
        .getMany();

      // 4. Trừ số phòng đã đặt đi 1 (Trả lại phòng trống cho khách sạn bán tiếp)
      for (const inv of inventories) {
        if (inv.bookedCount > 0) { // Đảm bảo không bao giờ bị âm
          inv.bookedCount -= 1;
          await manager.save(inv);
        }
      }

      return booking; // Trả về thông tin đơn hàng đã hủy thành công
    });
  }

  async findByEmailForClient(email: string) {
    return await this.bookingRepository.find({
      where: { guestEmail: email }, // Tìm theo email khách điền lúc đặt
      relations: ['hotel', 'roomType'], 
      order: { createdAt: 'DESC' },
    });
  }
}