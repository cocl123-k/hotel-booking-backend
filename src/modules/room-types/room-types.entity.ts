import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Hotel } from '../hotels/hotels.entity';
import { Inventory } from '../inventories/inventories.entity';
import { Booking } from '../bookings/bookings.entity';

@Entity('room_types')
export class RoomType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // VD: "Phòng Deluxe Hướng Biển"

  @Column()
  bedType: string;

  @Column({ type: 'int' })
  maxGuests: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  defaultPrice: number;

  @Column({ default: true })
  isActive: boolean; // Tắt/bật bán hạng phòng này

  @ManyToOne(() => Hotel, (hotel) => hotel.roomTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @OneToMany(() => Inventory, (inventory) => inventory.roomType)
  inventories: Inventory[];

  @OneToMany(() => Booking, (booking) => booking.roomType)
  bookings: Booking[];
}