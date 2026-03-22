import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { RoomType } from '../room-types/room-types.entity';

@Entity('inventories')
// Đảm bảo 1 hạng phòng chỉ có 1 bản ghi cấu hình cho 1 ngày cụ thể
@Unique(['roomType', 'date']) 
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date; // Ngày mở bán

  @Column({ type: 'int', default: 0 })
  allottedCount: number; // Tổng số phòng cấp cho nền tảng bán

  @Column({ type: 'int', default: 0 })
  bookedCount: number; // Số phòng đã có khách đặt

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number; // Giá bán riêng cho ngày này (Thay đổi theo mùa)

  @ManyToOne(() => RoomType, (roomType) => roomType.inventories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;
}