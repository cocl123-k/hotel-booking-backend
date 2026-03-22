import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/users.entity';
import { Hotel } from '../hotels/hotels.entity';
import { RoomType } from '../room-types/room-types.entity';

export enum BookingStatus {
  PENDING = 'PENDING',           // Chờ đối tác xác nhận
  CONFIRMED = 'CONFIRMED',       // Đối tác đã duyệt
  CHECKED_IN = 'CHECKED_IN',     // Khách đang lưu trú
  COMPLETED = 'COMPLETED',       // Khách đã trả phòng
  CANCELLED = 'CANCELLED',       // Đã hủy
  NO_SHOW = 'NO_SHOW'            // Khách không đến
}

@Entity('bookings')
export class Booking {
  // Thay vì UUID, ID này có thể tự custom dạng "BK-1024" cho dễ đọc
  @PrimaryGeneratedColumn('uuid')
  id: string; 

  @Column({ type: 'date' })
  checkInDate: Date;

  @Column({ type: 'date' })
  checkOutDate: Date;

  @Column({ type: 'int' })
  nights: number;

  // Thông tin khách lưu trú thực tế (Có thể khác thông tin User đăng nhập)
  @Column()
  guestName: string;

  @Column({ nullable: true })
  guestEmail: string;

  @Column()
  guestPhone: string;

  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  // Dòng tiền (Finance)
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number; // Khách phải trả tại khách sạn

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  platformFee: number; // Phí hoa hồng StayEase nhận

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  payoutAmount: number; // Tiền thực nhận của khách sạn

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  // Quan hệ
  @ManyToOne(() => User, (user) => user.bookings, { nullable: true }) // Nullable vì có thể khách vãng lai đặt không cần tài khoản
  @JoinColumn({ name: 'guestId' })
  guest: User;

  @ManyToOne(() => Hotel, (hotel) => hotel.bookings)
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @ManyToOne(() => RoomType, (roomType) => roomType.bookings)
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}