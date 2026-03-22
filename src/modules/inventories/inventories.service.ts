import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Inventory } from './inventories.entity';
import { BulkUpdateInventoryDto } from './dto/bulk-update-inventory.dto';
import { RoomType } from '../room-types/room-types.entity';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(RoomType) // Inject thêm để check quyền
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  // 1. Đối tác mở quỹ phòng cho một khoảng thời gian (Bulk Update/Insert)
  async bulkUpdate(partnerId: string, dto: BulkUpdateInventoryDto) {
    const { roomTypeId, startDate, endDate, allottedCount, price } = dto;
    
    // BẢO MẬT: Kiểm tra xem roomTypeId này có thực sự thuộc về Khách sạn của partnerId này không
    const roomType = await this.roomTypeRepository.findOne({
      where: { 
        id: roomTypeId,
        hotel: { partner: { id: partnerId } } 
      }
    });

    if (!roomType) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên hạng phòng này!');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const inventoriesToSave: Inventory[] = [];

    // Vòng lặp chạy từ ngày bắt đầu đến ngày kết thúc
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);

      let inventory = await this.inventoryRepository.findOne({
        where: { roomType: { id: roomTypeId }, date: currentDate }
      });

      if (!inventory) {
        inventory = this.inventoryRepository.create({
          roomType: { id: roomTypeId },
          date: currentDate,
        });
      }

      inventory.allottedCount = allottedCount;
      inventory.price = price;
      
      inventoriesToSave.push(inventory);
    }

    return await this.inventoryRepository.save(inventoriesToSave);
  }

  // 2. Client tra cứu phòng trống
  async checkAvailability(roomTypeId: string, checkIn: string, checkOut: string) {
    const inventories = await this.inventoryRepository.find({
      where: {
        roomType: { id: roomTypeId },
        date: Between(new Date(checkIn), new Date(checkOut)),
      },
      order: { date: 'ASC' },
    });

    // Logic cốt lõi: Nếu có 1 ngày trong khoảng thời gian đó mà (Đã đặt >= Phân bổ) -> Hết phòng!
    const isAvailable = inventories.every(inv => inv.allottedCount > inv.bookedCount);
    
    // Tính tổng tiền cho những ngày đó
    const totalPrice = inventories.reduce((sum, inv) => sum + Number(inv.price), 0);

    return {
      isAvailable,
      totalPrice,
      details: inventories
    };
  }
}