import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from './room-types.entity'; 
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { Hotel } from '../hotels/hotels.entity'; // Import bảng Hotel để check quyền

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  // 1. Tạo hạng phòng mới (Check quyền sở hữu khách sạn trực tiếp từ Database)
  async create(partnerId: string, createDto: CreateRoomTypeDto) {
    // BƯỚC A: Tách riêng hotelId ra khỏi các dữ liệu phòng khác
    const { hotelId, ...roomData } = createDto;

    // BƯỚC B: Kiểm tra xem Partner này có đúng là chủ của Khách sạn đang truyền lên không
    const hotelCount = await this.roomTypeRepository.manager.count(Hotel, {
      where: { id: hotelId, partner: { id: partnerId } }
    });

    if (hotelCount === 0) {
      throw new ForbiddenException('Bạn không có quyền thêm phòng cho khách sạn này!');
    }

    // BƯỚC C: Ghép dữ liệu phòng và ID khách sạn lại để lưu chuẩn TypeORM
    const newRoomType = this.roomTypeRepository.create({
      ...roomData,
      hotel: { id: hotelId }, 
    });

    return await this.roomTypeRepository.save(newRoomType);
  }

  // 2. Client lấy danh sách (Giữ nguyên)
  async findActiveByHotel(hotelId: string) {
    return await this.roomTypeRepository.find({
      where: { 
        hotel: { id: hotelId },
        isActive: true
      },
      order: { defaultPrice: 'ASC' }, 
    });
  }

  // 3. Partner lấy danh sách hạng phòng
  async findAllForPartner(hotelId: string, partnerId: string) {
    // Lấy ngày hôm nay (chuẩn YYYY-MM-DD để so sánh với DB)
    const today = new Date().toISOString().split('T')[0];

    return await this.roomTypeRepository.createQueryBuilder('roomType')
      .innerJoin('roomType.hotel', 'hotel')
      .innerJoin('hotel.partner', 'partner')
      .where('hotel.id = :hotelId', { hotelId })
      .andWhere('partner.id = :partnerId', { partnerId }) // Bảo mật: Check quyền
      // Lấy kèm cấu hình quỹ phòng của ngày hôm nay
      .leftJoinAndSelect('roomType.inventories', 'inventory', 'inventory.date = :today', { today })
      .orderBy('roomType.defaultPrice', 'ASC')
      .getMany();
  }

  // 4. Lấy chi tiết an toàn
  async findOne(id: string, partnerId: string) {
    const roomType = await this.roomTypeRepository.findOne({
      where: { 
        id, 
        hotel: { partner: { id: partnerId } } // Bắt buộc khách sạn phải thuộc về partnerId này
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Không tìm thấy hạng phòng này hoặc bạn không có quyền thao tác!`);
    }
    return roomType;
  }

  // 5. Cập nhật
  async update(id: string, partnerId: string, updateDto: UpdateRoomTypeDto) {
    const roomType = await this.findOne(id, partnerId); 
    
    Object.assign(roomType, updateDto);
    return await this.roomTypeRepository.save(roomType);
  }

  // 6. Xóa / Tạm ngưng
  async remove(id: string, partnerId: string) {
    const roomType = await this.findOne(id, partnerId);
    
    roomType.isActive = false;
    await this.roomTypeRepository.save(roomType);
    
    return { message: 'Đã tạm ngưng bán hạng phòng này' };
  }
}