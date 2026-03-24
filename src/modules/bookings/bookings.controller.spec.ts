import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from './bookings.entity';

describe('BookingsController', () => {
  let controller: BookingsController;
  let bookingsService: BookingsService;

  // 1. Tạo bản Mock cho BookingsService
  const mockBookingsService = {
    createClientBooking: jest.fn(),
    findByEmailForClient: jest.fn(),
    cancelClientBooking: jest.fn(),
    findAllForClient: jest.fn(),
    findAllForPartner: jest.fn(),
    findOneForPartner: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    bookingsService = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Xóa lịch sử sau mỗi Test Case
  });

  // ==========================================
  // 1. API ĐẶT PHÒNG (Client)
  // ==========================================
  describe('createBooking', () => {
    it('TC_01: Phải gọi service với userId nếu user đã đăng nhập', async () => {
      const dto = { hotelId: 'h1', roomTypeId: 'r1', checkIn: '2026-04-01', checkOut: '2026-04-03', guestName: 'Test', guestPhone: '0123' };
      const mockUser = { id: 'user-1' };
      
      await controller.createBooking(dto as any, mockUser);
      expect(bookingsService.createClientBooking).toHaveBeenCalledWith('user-1', dto);
    });

    it('TC_02: Phải gọi service với userId là null nếu user vãng lai (chưa đăng nhập)', async () => {
      const dto = { hotelId: 'h1', roomTypeId: 'r1', checkIn: '2026-04-01', checkOut: '2026-04-03', guestName: 'Test', guestPhone: '0123' };
      
      await controller.createBooking(dto as any, undefined); // Không truyền user
      expect(bookingsService.createClientBooking).toHaveBeenCalledWith(null, dto);
    });
  });

  // ==========================================
  // 2. API TRA CỨU ĐƠN BẰNG EMAIL (Guest)
  // ==========================================
  describe('lookupByEmail', () => {
    it('TC_03: Ném lỗi BadRequestException nếu không truyền email', () => {
      expect(() => controller.lookupByEmail('')).toThrow(BadRequestException);
      expect(() => controller.lookupByEmail('')).toThrow('Vui lòng cung cấp email để tra cứu!');
    });

    it('TC_04: Phải gọi service nếu truyền email hợp lệ', async () => {
      const email = 'guest@gmail.com';
      await controller.lookupByEmail(email);
      expect(bookingsService.findByEmailForClient).toHaveBeenCalledWith(email);
    });
  });

  // ==========================================
  // 3. API KHÁCH TỰ HỦY PHÒNG
  // ==========================================
  describe('cancelBooking', () => {
    it('TC_05: Phải tách đúng bookingId và userId để truyền cho service', async () => {
      const mockUser = { id: 'user-1' };
      await controller.cancelBooking('booking-123', mockUser);
      expect(bookingsService.cancelClientBooking).toHaveBeenCalledWith('booking-123', 'user-1');
    });
  });

  // ==========================================
  // 4. API LẤY LỊCH SỬ ĐẶT PHÒNG (Client)
  // ==========================================
  describe('getMyBookings', () => {
    it('TC_06: Phải gọi service kèm theo userId của khách', async () => {
      const mockUser = { id: 'user-1' };
      await controller.getMyBookings(mockUser);
      expect(bookingsService.findAllForClient).toHaveBeenCalledWith('user-1');
    });
  });

  // ==========================================
  // 5. API PARTNER XEM DANH SÁCH ĐƠN (Phân trang, Tìm kiếm)
  // ==========================================
  describe('findAll', () => {
    const mockUser = { id: 'partner-1' };

    it('TC_07: Ném lỗi BadRequestException nếu thiếu hotelId', () => {
      expect(() => controller.findAll(mockUser, '')).toThrow(BadRequestException);
      expect(() => controller.findAll(mockUser, '')).toThrow('Vui lòng cung cấp mã khách sạn (hotelId)');
    });

    it('TC_08: Truyền đúng tham số phân trang, bộ lọc xuống service', async () => {
      // Ép string về số để test logic parseInt trong controller
      await controller.findAll(mockUser, 'hotel-1', '2', '20', BookingStatus.CONFIRMED, 'Nguyen Van A');
      
      expect(bookingsService.findAllForPartner).toHaveBeenCalledWith(
        'partner-1', // partnerId
        'hotel-1',   // hotelId
        2,           // page (đã parse sang số)
        20,          // limit (đã parse sang số)
        BookingStatus.CONFIRMED, // status
        'Nguyen Van A' // search
      );
    });

    it('TC_09: Xử lý đúng nếu token dùng trường `sub` thay vì `id`', async () => {
      const userWithSub = { sub: 'partner-sub-1' };
      await controller.findAll(userWithSub, 'hotel-1'); // Không truyền page, limit sẽ lấy mặc định 1, 10
      
      expect(bookingsService.findAllForPartner).toHaveBeenCalledWith(
        'partner-sub-1', 'hotel-1', 1, 10, undefined, undefined
      );
    });
  });

  // ==========================================
  // 6. API PARTNER XEM CHI TIẾT ĐƠN
  // ==========================================
  describe('findOne', () => {
    it('TC_10: Phải truyền đúng bookingId và partnerId (từ user.id)', async () => {
      const mockUser = { id: 'partner-1' };
      await controller.findOne('booking-123', mockUser);
      expect(bookingsService.findOneForPartner).toHaveBeenCalledWith('booking-123', 'partner-1');
    });
  });

  // ==========================================
  // 7. API PARTNER CẬP NHẬT TRẠNG THÁI (Duyệt/Hủy)
  // ==========================================
  describe('updateStatus', () => {
    it('TC_11: Phải truyền đúng tham số cho service', async () => {
      const mockUser = { id: 'partner-1' };
      const dto = { status: BookingStatus.CONFIRMED };
      
      await controller.updateStatus('booking-123', dto, mockUser);
      
      expect(bookingsService.updateStatus).toHaveBeenCalledWith('booking-123', 'partner-1', BookingStatus.CONFIRMED);
    });
  });
});