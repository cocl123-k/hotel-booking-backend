import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../users/users.entity';
import { RoomType } from '../room-types/room-types.entity';
import { Booking } from '../bookings/bookings.entity';

export enum HotelStatus {
  PENDING = 'PENDING',           // Chờ Admin duyệt
  ACTIVE = 'ACTIVE',             // Đang hoạt động trên nền tảng
  SUSPENDED = 'SUSPENDED',       // Bị Admin đình chỉ
  REJECTED = 'REJECTED'          // Bị Admin từ chối hồ sơ
}

@Entity('hotels')
export class Hotel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ type: 'int', default: 0 })
  starRating: number;

  @Column({ nullable: true })
  taxId: string; // Mã số thuế (Để Admin duyệt)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.05 })
  commissionRate: number; // Mức phí nền tảng (Mặc định 5%)

  @Column({ type: 'enum', enum: HotelStatus, default: HotelStatus.PENDING })
  status: HotelStatus;

  // Quan hệ: Thuộc về 1 Đối tác (User)
  @ManyToOne(() => User, (user) => user.hotels)
  @JoinColumn({ name: 'partnerId' })
  partner: User;

  // Quan hệ: Có nhiều Hạng phòng
  @OneToMany(() => RoomType, (roomType) => roomType.hotel)
  roomTypes: RoomType[];

  // Quan hệ: Có nhiều Đơn đặt phòng
  @OneToMany(() => Booking, (booking) => booking.hotel)
  bookings: Booking[];

  @CreateDateColumn()
  createdAt: Date;
}