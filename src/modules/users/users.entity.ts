import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Hotel } from '../hotels/hotels.entity';
import { Booking } from '../bookings/bookings.entity';

export enum PartnerStatus {
  NONE = 'NONE',         // Khách hàng bình thường
  PENDING = 'PENDING',   // Đang chờ duyệt đối tác
  APPROVED = 'APPROVED', // Đã duyệt
  REJECTED = 'REJECTED', // Từ chối
}

export enum UserRole {
  GUEST = 'GUEST',         // Khách hàng đặt phòng
  PARTNER = 'PARTNER',     // Chủ khách sạn
  ADMIN = 'ADMIN',         // Nhân viên StayEase
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.GUEST })
  role: UserRole;

  @Column({ type: 'enum', enum: PartnerStatus, default: PartnerStatus.NONE })
  partnerStatus: PartnerStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  otpCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpires: Date | null;

  @Column({ default: 0 })
  otpAttempts: number;

  // Quan hệ: 1 Đối tác có thể sở hữu nhiều Khách sạn
  @OneToMany(() => Hotel, (hotel) => hotel.partner)
  hotels: Hotel[];

  // Quan hệ: 1 Khách hàng có thể có nhiều Đơn đặt phòng
  @OneToMany(() => Booking, (booking) => booking.guest)
  bookings: Booking[];
}