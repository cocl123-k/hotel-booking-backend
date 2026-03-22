export class SearchHotelDto {
  location: string;      // VD: 'Đà Lạt'
  checkIn: string;    // VD: '2026-04-15'
  checkOut: string;   // VD: '2026-04-17'
  rooms: number;      // Số phòng khách cần (VD: 1)
  guests: number;     // Số khách (VD: 2)
}