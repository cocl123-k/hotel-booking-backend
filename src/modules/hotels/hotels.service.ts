import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Hotel, HotelStatus } from './hotels.entity';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UserRole } from '../users/users.entity';
import { RoomType } from '../room-types/room-types.entity';
import { SearchHotelDto } from './dto/search-hotel.dto';

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,

    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  // 1. Đối tác tạo khách sạn mới (Mặc định PENDING)
  async create(partnerId: string, createHotelDto: CreateHotelDto) {
    const newHotel = this.hotelRepository.create({
      ...createHotelDto,
      partner: { id: partnerId }, 
      status: HotelStatus.PENDING,
    });
    return await this.hotelRepository.save(newHotel);
  }

  // 3. Super Admin lấy tất cả (Để duyệt)
  async findAllForAdmin(status?: HotelStatus) {
    const query = this.hotelRepository.createQueryBuilder('hotel')
      .leftJoinAndSelect('hotel.partner', 'partner'); // Lấy luôn thông tin chủ KS
    
    if (status) {
      query.where('hotel.status = :status', { status });
    }
    return await query.getMany();
  }

  async findHotelsByPartnerId(partnerId: string) {
    return await this.hotelRepository.find({
      where: { partner: { id: partnerId } }, 
      select: ['id', 'name', 'city', 'status', 'starRating'], 
      order: { createdAt: 'DESC' }
    });
  }

  // 4. Lấy chi tiết
  async findOne(id: string) {
    const hotel = await this.hotelRepository.findOne({ where: { id } });
    if (!hotel) throw new NotFoundException('Không tìm thấy khách sạn');
    return hotel;
  }

  // 5. Cập nhật (Cho cả Partner sửa thông tin và Admin duyệt/cấm)
async update(id: string, updateHotelDto: UpdateHotelDto, user: any) {
    // 1. Phải lấy khách sạn KÈM THEO thông tin người chủ (partner) để kiểm tra
    const hotel = await this.hotelRepository.findOne({ 
      where: { id },
      relations: ['partner'] // Bắt buộc phải join bảng partner
    });

    if (!hotel) throw new NotFoundException('Không tìm thấy khách sạn');

    const partnerId = user.id || user.sub; // Lấy ID chuẩn từ Token

    // 2. LUỒNG XỬ LÝ NẾU LÀ PARTNER (ĐỐI TÁC)
    if (user.role === UserRole.PARTNER) {
      // CHECK QUYỀN TRỰC TIẾP TỪ DATABASE thay vì dùng user.hotelIds
      if (hotel.partner.id !== partnerId) {
        throw new ForbiddenException('Không có quyền chỉnh sửa khách sạn này');
      }
      
      const { status, commissionRate, ...safeData } = updateHotelDto;
      Object.assign(hotel, safeData);
    } 
    
    // 3. LUỒNG XỬ LÝ NẾU LÀ SUPER ADMIN
    else if (user.role === UserRole.ADMIN) {
      Object.assign(hotel, updateHotelDto);
    }

    // 4. Lưu dữ liệu đã cập nhật xuống Database
    return await this.hotelRepository.save(hotel);
  }
  async searchAvailableHotels(query: SearchHotelDto) {
    const { location, checkIn, checkOut, rooms, guests } = query;
    
    // 1. Tính số đêm khách lưu trú
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));

    // BƯỚC 1: Tìm tất cả các "Hạng phòng" thỏa mãn điều kiện
    // Điều kiện: Đang bán (isActive) + Chứa đủ người + CÒN PHÒNG TRỐNG trong TẤT CẢ các đêm
    const availableRoomTypes = await this.roomTypeRepository.createQueryBuilder('rt')
      .innerJoin('rt.inventories', 'inv')
      .where('rt.isActive = true AND rt.maxGuests >= :guests', { guests })
      .andWhere('inv.date >= :checkIn AND inv.date < :checkOut', { checkIn, checkOut })
      .groupBy('rt.id')
      // Lọc: Số phòng trống nhỏ nhất trong các ngày đó phải >= số phòng khách cần
      .having('MIN(inv.allottedCount - inv.bookedCount) >= :rooms', { rooms })
      // Lọc: Đối tác phải cấu hình quỹ phòng cho ĐỦ số đêm khách cần (tránh lỗi thiếu ngày)
      .andHaving('COUNT(inv.id) = :nights', { nights })
      .getMany();

    // Rút trích mảng ID của các hạng phòng thỏa mãn
    const roomTypeIds = availableRoomTypes.map(rt => rt.id);

    // Nếu không có bất kỳ phòng nào trống trong cả thành phố -> Trả về mảng rỗng
    if (roomTypeIds.length === 0) {
      return [];
    }

    const hotels = await this.hotelRepository.find({
      where: [
        { city: ILike(`%${location}%`), status: HotelStatus.ACTIVE, roomTypes: { id: In(roomTypeIds) } },
        { address: ILike(`%${location}%`), status: HotelStatus.ACTIVE, roomTypes: { id: In(roomTypeIds) } },
        { name: ILike(`%${location}%`), status: HotelStatus.ACTIVE, roomTypes: { id: In(roomTypeIds) } }
      ],
      relations: ['roomTypes'], 
    });

    const formattedHotels = hotels.map(hotel => {
      // 3.1: Chỉ lọc lại những hạng phòng thực sự CÒN TRỐNG trong mảng ID đã tìm ở Bước 1
      const availableRoomsInThisHotel = hotel.roomTypes.filter(rt => roomTypeIds.includes(rt.id));

      // 3.2: Tìm giá thấp nhất trong số các phòng CÒN TRỐNG đó
      const startingPrice = Math.min(...availableRoomsInThisHotel.map(rt => Number(rt.defaultPrice)));

      return {
        ...hotel, 
        
        startingPrice: startingPrice, 
        
        roomTypes: availableRoomsInThisHotel, 
      };
    });

    return formattedHotels;
  }
  // ==========================================
  // API ADMIN: DUYỆT KHÁCH SẠN MỞ BÁN
  // ==========================================
  async approveHotel(id: string) {
    const hotel = await this.findOne(id);
    
    if (hotel.status === HotelStatus.ACTIVE) {
      throw new ConflictException('Khách sạn này đã được duyệt và đang hoạt động rồi!');
    }

    hotel.status = HotelStatus.ACTIVE; // Đổi trạng thái thành ACTIVE
    await this.hotelRepository.save(hotel);

    return { message: `Đã duyệt khách sạn: ${hotel.name}` };
  }

  // ==========================================
  // API ADMIN: TỪ CHỐI KHÁCH SẠN
  // ==========================================
  async rejectHotel(id: string) {
    const hotel = await this.findOne(id); 
    
    if (hotel.status !== HotelStatus.PENDING) {
      throw new ConflictException('Chỉ có thể từ chối khách sạn đang ở trạng thái chờ duyệt!');
    }

    hotel.status = HotelStatus.REJECTED; // Đổi trạng thái thành REJECTED
    await this.hotelRepository.save(hotel);

    return { message: `Đã từ chối khách sạn: ${hotel.name}` };
  }
}