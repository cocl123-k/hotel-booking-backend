import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';
import { UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/users.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let mailService: MailService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    saveUser: jest.fn(),
    savePartner: jest.fn(),
    findOne: jest.fn(),
    updateOtp: jest.fn(),
    incrementOtpAttempts: jest.fn(),
    clearOtp: jest.fn(),
  };

  const mockJwtService = { sign: jest.fn() };
  
  const mockMailService = {
    sendOtpEmail: jest.fn(),
    sendGuestBookingOtpEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // HÀM LOGIN
  // ==========================================
  describe('login', () => {
    const loginDto = { email: 'test@gmail.com', password: '123' };

    it('TC_01: Ném lỗi Unauthorized nếu email không tồn tại', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('TC_02: Ném lỗi Unauthorized nếu sai mật khẩu', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Ép bcrypt báo sai pass
      
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('TC_03: Trả về token và thông tin user nếu đăng nhập thành công', async () => {
      const mockUser = { id: '1', email: 'test@gmail.com', role: UserRole.GUEST, passwordHash: 'hash', hotels: [{ id: 'h1' }] };
      
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('fake-token');

      const result = await authService.login(loginDto);

      expect(result.accessToken).toEqual('fake-token');
      expect(result.user.hotelIds).toEqual(['h1']);
    });
  });

  // ==========================================
  // HÀM REGISTER (User thường)
  // ==========================================
  describe('register', () => {
    const dto = { email: 'new@gmail.com', password: '123', fullName: 'Test' };

    it('TC_04: Ném lỗi Conflict nếu email đã tồn tại', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1' }); // Báo là đã có người dùng
      await expect(authService.register(dto as any)).rejects.toThrow(ConflictException);
    });

    it('TC_05: Đăng ký thành công, hash mật khẩu và lưu user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pass');
      mockUsersService.saveUser.mockResolvedValue({ id: '2', email: dto.email });

      const result = await authService.register(dto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
      expect(mockUsersService.saveUser).toHaveBeenCalledWith({ email: dto.email, fullName: dto.fullName, passwordHash: 'hashed_pass' });
      expect(result.id).toEqual('2');
    });
  });

  // ==========================================
  // HÀM REGISTER PARTNER
  // ==========================================
  describe('registerPartner', () => {
    const dto = { email: 'partner@gmail.com', password: '123', fullName: 'Partner', phone: '012' };

    it('TC_06: Ném lỗi Conflict nếu email đối tác đã tồn tại', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1' });
      await expect(authService.registerPartner(dto as any)).rejects.toThrow(ConflictException);
    });

    it('TC_07: Đăng ký đối tác thành công', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pass');
      
      await authService.registerPartner(dto as any);
      
      expect(mockUsersService.savePartner).toHaveBeenCalledWith({
        email: dto.email, fullName: dto.fullName, phone: dto.phone, passwordHash: 'hashed_pass'
      });
    });
  });

  // ==========================================
  // HÀM ĐỔI MẬT KHẨU
  // ==========================================
  describe('changePassword', () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };

    it('TC_08: Ném lỗi NotFound nếu không tìm thấy user', async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      await expect(authService.changePassword('1', dto)).rejects.toThrow(NotFoundException);
    });

    it('TC_09: Ném lỗi BadRequest nếu mật khẩu cũ sai', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: '1', passwordHash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Cố tình báo sai

      await expect(authService.changePassword('1', dto)).rejects.toThrow(BadRequestException);
    });

    it('TC_10: Ném lỗi BadRequest nếu mật khẩu mới trùng mật khẩu cũ', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: '1', passwordHash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); 

      await expect(authService.changePassword('1', dto)).rejects.toThrow('Mật khẩu mới không được trùng');
    });

    it('TC_11: Đổi mật khẩu thành công', async () => {
      const mockUser = { id: '1', passwordHash: 'hash' };
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); 
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false); 
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');

      const result = await authService.changePassword('1', dto);

      expect(mockUser.passwordHash).toEqual('new_hash');
      expect(mockUsersService.saveUser).toHaveBeenCalledWith(mockUser);
      expect(result.message).toEqual('Đổi mật khẩu thành công!');
    });
  });

  // ==========================================
  // HÀM QUÊN MẬT KHẨU (Gửi OTP)
  // ==========================================
  describe('forgotPassword', () => {
    it('TC_12: Ném lỗi NotFound nếu email không tồn tại', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(authService.forgotPassword({ email: 'ghost@gmail.com' })).rejects.toThrow(NotFoundException);
    });

    it('TC_13: Tạo OTP và gửi email thành công', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'test@gmail.com' });
      
      const result = await authService.forgotPassword({ email: 'test@gmail.com' });

      // Kiểm tra xem hàm updateOtp có được gọi với mã OTP (chuỗi) và Date (hạn) không
      expect(mockUsersService.updateOtp).toHaveBeenCalledWith('1', expect.any(String), expect.any(Date));
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith('test@gmail.com', expect.any(String));
      expect(result.message).toContain('đã được gửi');
    });
  });

  // ==========================================
  // HÀM ĐẶT LẠI MẬT KHẨU (Reset Password)
  // ==========================================
  describe('resetPassword', () => {
    const dto = { email: 'test@gmail.com', otp: '123456', newPassword: 'new' };

    it('TC_14: Ném lỗi nếu chưa có OTP hoặc email sai', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(authService.resetPassword(dto)).rejects.toThrow('Yêu cầu không hợp lệ');
    });

    it('TC_15: Báo lỗi nếu nhập sai quá 5 lần và xóa OTP', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', otpCode: '123456', otpAttempts: 5 });
      await expect(authService.resetPassword(dto)).rejects.toThrow('nhập sai quá nhiều lần');
      expect(mockUsersService.updateOtp).toHaveBeenCalledWith('1', null, null);
    });

    it('TC_16: Báo lỗi nếu OTP hết hạn', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10); // Lùi lại 10 phút trước
      
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', otpCode: '123456', otpAttempts: 0, otpExpires: pastDate });
      await expect(authService.resetPassword(dto)).rejects.toThrow('đã hết hạn');
    });

    it('TC_17: Báo lỗi và tăng biến đếm nếu OTP sai', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', otpCode: '654321', otpAttempts: 0, otpExpires: futureDate });
      
      await expect(authService.resetPassword(dto)).rejects.toThrow('không chính xác');
      expect(mockUsersService.incrementOtpAttempts).toHaveBeenCalledWith('1');
    });

    it('TC_18: Đặt lại mật khẩu thành công', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', otpCode: '123456', otpAttempts: 0, otpExpires: futureDate });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new');

      const result = await authService.resetPassword(dto);

      expect(mockUsersService.clearOtp).toHaveBeenCalledWith('1', 'hashed_new');
      expect(result.message).toEqual('Đổi mật khẩu thành công!');
    });
  });

  // ==========================================
  // HÀM XÁC THỰC OTP KHÁCH (GUEST)
  // ==========================================
  describe('verifyGuestOtp', () => {
    it('TC_19: Trả về Token nếu xác thực OTP Guest thành công', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'guest@gmail.com', role: UserRole.GUEST, otpCode: '123456', otpAttempts: 0, otpExpires: futureDate });
      mockJwtService.sign.mockReturnValue('guest-token');

      const result = await authService.verifyGuestOtp('guest@gmail.com', '123456');

      expect(mockUsersService.updateOtp).toHaveBeenCalledWith('1', null, null); // Xóa OTP sau khi dùng
      expect(result.accessToken).toEqual('guest-token');
      expect(result.user.role).toEqual(UserRole.GUEST);
    });
  });
});