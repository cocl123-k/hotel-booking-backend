import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus } from './bookings.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Inventory } from '../inventories/inventories.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: Repository<Booking>;
  let dataSource: DataSource;

  // ==========================================
  // 1. SETUP MOCK CHO TYPEORM & TRANSACTION
  // ==========================================
  
  // Mock QueryBuilder (Giả lập các hàm nối chuỗi của TypeORM)
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  // Mock Repository cơ bản
  const mockBookingRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  // Mock EntityManager (Dùng bên trong các khối Transaction)
  const mockEntityManager = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  // Mock DataSource để giả lập Transaction
  const mockDataSource = {
    // Ép transaction chạy ngay lập tức và truyền mockEntityManager vào
    transaction: jest.fn().mockImplementation(async (cb) => await cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TEST: findAllForPartner (Danh sách có phân trang)
  // ==========================================
  describe('findAllForPartner', () => {
    it('TC_01: Trả về danh sách phân trang chuẩn xác không có bộ lọc phụ', async () => {
      // Giả lập DB trả về 1 mảng data và tổng số lượng là 1
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'b1' }], 1]);

      const result = await service.findAllForPartner('partner-1', 'hotel-1', 2, 10);

      // Kiểm tra logic toán học của phân trang (skip = (page-1)*limit)
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); 
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.meta.totalPages).toEqual(1);
      expect(result.data[0].id).toEqual('b1');
    });

    it('TC_02: Phải gọi andWhere đúng cấu trúc nếu có truyền Search và Status', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForPartner('partner-1', 'hotel-1', 1, 10, BookingStatus.CONFIRMED, 'Kien');

      // Kiểm tra xem Query Builder có ghép câu lệnh tìm kiếm không
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(booking.guestName) LIKE LOWER(:search)'),
        { search: '%Kien%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'booking.status = :status', { status: BookingStatus.CONFIRMED }
      );
    });
  });

  // ==========================================
  // TEST: findOne
  // ==========================================
  describe('findOne', () => {
    it('TC_03: Ném NotFoundException nếu không tìm thấy đơn hàng theo mảng hotelIds', async () => {
      mockBookingRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('b1', ['h1'])).rejects.toThrow(NotFoundException);
    });

    it('TC_04: Trả về đơn hàng nếu tìm thấy', async () => {
      const mockBooking = { id: 'b1' };
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      const result = await service.findOne('b1', ['h1']);
      expect(result).toEqual(mockBooking);
    });
  });

  // ==========================================
  // TEST: findOneForPartner
  // ==========================================
  describe('findOneForPartner', () => {
    it('TC_05: Ném lỗi nếu IDOR (tìm đơn không thuộc về partnerId)', async () => {
      mockBookingRepository.findOne.mockResolvedValue(null);
      await expect(service.findOneForPartner('b1', 'partner-1')).rejects.toThrow(NotFoundException);
    });

    it('TC_06: Trả về đúng đơn hàng bảo mật', async () => {
      const mockBooking = { id: 'b1' };
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      const result = await service.findOneForPartner('b1', 'partner-1');
      expect(result).toEqual(mockBooking);
    });
  });

  // ==========================================
  // TEST: updateStatus
  // ==========================================
  describe('updateStatus', () => {
    it('TC_07: Ném BadRequest nếu đơn đã chốt (COMPLETED, CANCELLED, NO_SHOW)', async () => {
      // Dùng spyOn để giả lập nội bộ hàm findOneForPartner trả về status cấm kỵ
      jest.spyOn(service, 'findOneForPartner').mockResolvedValue({ status: BookingStatus.COMPLETED } as any);

      await expect(service.updateStatus('b1', 'p1', BookingStatus.CONFIRMED))
        .rejects.toThrow(BadRequestException);
    });

    it('TC_08: Lưu bình thường không cần Transaction nếu duyệt đơn (CONFIRMED)', async () => {
      const mockBooking = { id: 'b1', status: BookingStatus.PENDING };
      jest.spyOn(service, 'findOneForPartner').mockResolvedValue(mockBooking as any);
      mockBookingRepository.save.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });

      const result = await service.updateStatus('b1', 'p1', BookingStatus.CONFIRMED);

      expect(mockBookingRepository.save).toHaveBeenCalled();
      expect(result.status).toEqual(BookingStatus.CONFIRMED);
    });

    it('TC_09: Kích hoạt Transaction và Hoàn trả quỹ phòng nếu là CANCELLED', async () => {
      const mockBooking = { 
        id: 'b1', 
        status: BookingStatus.PENDING, 
        roomType: { id: 'r1' },
        checkInDate: '2026-04-01',
        checkOutDate: '2026-04-02'
      };
      jest.spyOn(service, 'findOneForPartner').mockResolvedValue(mockBooking as any);
      
      // Giả lập quỹ phòng đang bị chiếm dụng (bookedCount = 1)
      const mockInventory = { id: 'inv1', bookedCount: 1 };
      mockQueryBuilder.getMany.mockResolvedValue([mockInventory]);

      await service.updateStatus('b1', 'p1', BookingStatus.CANCELLED);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
      // Kỳ vọng trừ quỹ phòng về 0
      expect(mockInventory.bookedCount).toEqual(0);
      expect(mockEntityManager.save).toHaveBeenCalledWith(mockInventory);
    });
  });

  // ==========================================
  // TEST: findAllForClient
  // ==========================================
  describe('findAllForClient', () => {
    it('TC_10: Gọi hàm tìm kiếm với guestId chuẩn xác', async () => {
      mockBookingRepository.find.mockResolvedValue([{ id: 'b1' }]);
      await service.findAllForClient('user-1');
      expect(mockBookingRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guest: { id: 'user-1' } } })
      );
    });
  });

  // ==========================================
  // TEST: createClientBooking (TRÁI TIM CỦA HỆ THỐNG)
  // ==========================================
  describe('createClientBooking', () => {
    const dto = {
      hotelId: 'h1', roomTypeId: 'r1', checkIn: '2026-04-01', checkOut: '2026-04-03', // 2 ĐÊM
      guestName: 'Kien', guestPhone: '012', guestEmail: 'a@a.com'
    };

    it('TC_11: Ném lỗi nếu ngày check-out nhỏ hơn hoặc bằng check-in (Nights <= 0)', async () => {
      const badDto = { ...dto, checkIn: '2026-04-03', checkOut: '2026-04-01' };
      await expect(service.createClientBooking('u1', badDto)).rejects.toThrow('Ngày trả phòng phải sau');
    });

    it('TC_12: Ném lỗi bên trong Transaction nếu thiếu dữ liệu tồn kho (Đối tác chưa mở bán đủ ngày)', async () => {
      // Đặt phòng 2 đêm, nhưng getMany chỉ trả về 1 ngày tồn kho
      mockQueryBuilder.getMany.mockResolvedValue([{ date: '2026-04-01' }]); 
      await expect(service.createClientBooking('u1', dto)).rejects.toThrow('chưa mở bán đủ số ngày');
    });

    it('TC_13: Ném lỗi nếu có 1 ngày bị Hết Phòng (bookedCount >= allottedCount)', async () => {
      // 2 đêm, đêm thứ 2 bị hết phòng (5/5)
      const inventories = [
        { date: '2026-04-01', bookedCount: 0, allottedCount: 5, price: 100 },
        { date: '2026-04-02', bookedCount: 5, allottedCount: 5, price: 100 }
      ];
      mockQueryBuilder.getMany.mockResolvedValue(inventories);
      
      await expect(service.createClientBooking('u1', dto)).rejects.toThrow('đã hết phòng');
    });

    it('TC_14: Đặt phòng THÀNH CÔNG, tính đúng tiền, đúng hoa hồng', async () => {
      // 2 đêm, giá 1000/đêm -> Tổng 2000. Hoa hồng 5% = 100. Khách sạn nhận 1900.
      const inventories = [
        { date: '2026-04-01', bookedCount: 0, allottedCount: 5, price: 1000 },
        { date: '2026-04-02', bookedCount: 0, allottedCount: 5, price: 1000 }
      ];
      mockQueryBuilder.getMany.mockResolvedValue(inventories);
      
      mockEntityManager.create.mockImplementation((entity, payload) => payload);
      mockEntityManager.save.mockResolvedValue({ id: 'new-booking' });

      await service.createClientBooking('u1', dto);

      // 1. Phải cộng dồn bookedCount cho cả 2 ngày tồn kho
      expect(inventories[0].bookedCount).toEqual(1);
      expect(inventories[1].bookedCount).toEqual(1);
      
      // 2. Kiểm tra logic toán học tính tiền
      expect(mockEntityManager.create).toHaveBeenCalledWith(Booking, expect.objectContaining({
        nights: 2,
        totalAmount: 2000,
        platformFee: 100, // 2000 * 5%
        payoutAmount: 1900 // 2000 - 100
      }));
    });
  });

  // ==========================================
  // TEST: cancelClientBooking (Khách tự hủy)
  // ==========================================
  describe('cancelClientBooking', () => {
    it('TC_15: Báo lỗi nếu tìm không thấy đơn hoặc không phải của khách', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      await expect(service.cancelClientBooking('b1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('TC_16: Báo lỗi nếu đơn đã hủy từ trước', async () => {
      mockEntityManager.findOne.mockResolvedValue({ status: BookingStatus.CANCELLED });
      await expect(service.cancelClientBooking('b1', 'u1')).rejects.toThrow('đã được hủy trước đó');
    });

    it('TC_17: Báo lỗi nếu đã QUÁ HẠN HỦY (Ngày Check-in nằm trong quá khứ)', async () => {
      // Ngày check-in là năm 2000 (đã qua)
      mockEntityManager.findOne.mockResolvedValue({ 
        status: BookingStatus.PENDING,
        checkInDate: '2000-01-01' 
      });
      await expect(service.cancelClientBooking('b1', 'u1')).rejects.toThrow('đã quá hạn');
    });

    it('TC_18: Hủy THÀNH CÔNG và HOÀN TRẢ lại phòng trống', async () => {
      // Ngày check-in ở tương lai xa (đảm bảo hàm if(new Date >= checkIn) không bị chặn)
      const mockBooking = { 
        id: 'b1', status: BookingStatus.PENDING, checkInDate: '2099-01-01', roomType: { id: 'r1' } 
      };
      mockEntityManager.findOne.mockResolvedValue(mockBooking);
      
      // Giả lập 2 ngày tồn kho đang có 1 phòng bị giữ
      const inventories = [{ bookedCount: 1 }, { bookedCount: 2 }];
      mockQueryBuilder.getMany.mockResolvedValue(inventories);

      await service.cancelClientBooking('b1', 'u1');

      // Đơn hàng phải bị chuyển thành CANCELLED
      expect(mockBooking.status).toEqual(BookingStatus.CANCELLED);
      expect(mockEntityManager.save).toHaveBeenCalledWith(mockBooking);

      // Cả 2 ngày tồn kho phải được trả lại (-1)
      expect(inventories[0].bookedCount).toEqual(0);
      expect(inventories[1].bookedCount).toEqual(1);
    });
  });

  // ==========================================
  // TEST: findByEmailForClient
  // ==========================================
  describe('findByEmailForClient', () => {
    it('TC_19: Truy vấn DB với đúng email', async () => {
      mockBookingRepository.find.mockResolvedValue([{ id: 'b1' }]);
      await service.findByEmailForClient('test@gmail.com');
      expect(mockBookingRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guestEmail: 'test@gmail.com' } })
      );
    });
  });
});