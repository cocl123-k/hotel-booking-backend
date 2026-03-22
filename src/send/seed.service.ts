import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, PartnerStatus } from '../modules/users/users.entity';
import { Hotel, HotelStatus } from '../modules/hotels/hotels.entity';
import { RoomType } from '../modules/room-types/room-types.entity';
import { Inventory } from '../modules/inventories/inventories.entity';
import { Booking, BookingStatus } from '../modules/bookings/bookings.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Hotel) private hotelRepo: Repository<Hotel>,
    @InjectRepository(RoomType) private roomRepo: Repository<RoomType>,
    @InjectRepository(Inventory) private invRepo: Repository<Inventory>,
  ) {}

  // Hàm này tự chạy khi App Start
  async onApplicationBootstrap() {
    console.log('🌱 Seed: Đang thiết lập lại dữ liệu...');
    await this.resetDatabase();
    await this.createData();
    console.log('✅ Seed: Hoàn tất! Bạn có thể test API ngay bây giờ.');
  }

  private async resetDatabase() {
    // Xóa theo thứ tự để tránh lỗi Foreign Key
    await this.dataSource.query('TRUNCATE TABLE "bookings" CASCADE');
    await this.dataSource.query('TRUNCATE TABLE "inventories" CASCADE');
    await this.dataSource.query('TRUNCATE TABLE "room_types" CASCADE');
    await this.dataSource.query('TRUNCATE TABLE "hotels" CASCADE');
    await this.dataSource.query('TRUNCATE TABLE "users" CASCADE');
  }

  private async createData() {
    const password = await bcrypt.hash('123456', 10);

    // 1. Tạo Admin
    const admin = await this.userRepo.save({
      email: 'admin@stayease.com',
      passwordHash: password,
      fullName: 'System Admin',
      role: UserRole.ADMIN,
    });

    // 2. Tạo Partner
    const partner = await this.userRepo.save({
      email: 'partner@stayease.com',
      passwordHash: password,
      fullName: 'Chủ Khách Sạn A',
      role: UserRole.PARTNER,
      partnerStatus: PartnerStatus.APPROVED,
    });

    // 3. Tạo Khách hàng (Guest)
    const guest = await this.userRepo.save({
      email: 'guest@gmail.com',
      passwordHash: password,
      fullName: 'Nguyễn Văn Khách',
      role: UserRole.GUEST,
    });

    // 4. Tạo Khách sạn (Trạng thái ACTIVE để tìm kiếm được ngay)
    const hotel = await this.hotelRepo.save({
      name: 'StayEase Luxury Resort',
      address: '123 Đường Biển',
      city: 'Đà Nẵng',
      starRating: 5,
      taxId: 'MST-123456',
      status: HotelStatus.ACTIVE,
      partner: partner,
    });

    // 5. Tạo Hạng phòng
    const roomType = await this.roomRepo.save({
      name: 'Phòng Deluxe Suite',
      bedType: '1 Giường Đôi Large',
      maxGuests: 2,
      defaultPrice: 1500000,
      isActive: true,
      hotel: hotel,
    });

    // 6. Tạo Quỹ phòng (Inventory) cho 30 ngày tới
    const inventories: Inventory[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      inventories.push(this.invRepo.create({
        roomType: roomType,
        date: date,
        allottedCount: 10, // Có 10 phòng mỗi ngày
        bookedCount: 0,
        price: 1500000,
      }));
    }
    await this.invRepo.save(inventories);

    console.log('📊 Tài khoản test:');
    console.log('- Admin: admin@stayease.com / 123456');
    console.log('- Partner: partner@stayease.com / 123456');
    console.log('- Guest: guest@gmail.com / 123456');
  }
}