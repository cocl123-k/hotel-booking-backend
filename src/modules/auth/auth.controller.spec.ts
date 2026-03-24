import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // 1. Tạo một bản Mock (bản sao giả mạo) của AuthService
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    registerPartner: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    sendGuestOtp: jest.fn(),
    verifyGuestOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService, 
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  // Xóa sạch lịch sử gọi hàm sau mỗi lần test
  afterEach(() => {
    jest.clearAllMocks(); 
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('phải gọi hàm authService.login với đúng dữ liệu và trả về kết quả', async () => {
      const loginDto = { email: 'test@gmail.com', password: 'password123' };
      const expectedResult = { accessToken: 'fake-token' };
      
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('register', () => {
    it('phải gọi hàm authService.register với đúng CreateUserDto', async () => {
      const dto = { email: 'test@gmail.com', password: '123', fullName: 'Test' };
      const expectedResult = { id: '1', ...dto };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('registerPartner', () => {
    it('phải gọi hàm authService.registerPartner', async () => {
      const dto = { email: 'partner@gmail.com', password: '123', fullName: 'Partner', phone: '0123' };
      mockAuthService.registerPartner.mockResolvedValue({ id: '2' });

      await controller.registerPartner(dto as any);

      expect(authService.registerPartner).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('phải lấy đúng user.id từ token và gọi authService.changePassword', async () => {
      const mockUser = { id: 'user-uuid', role: 'GUEST' };
      const dto = { currentPassword: 'old', newPassword: 'new' };
      const expectedResult = { message: 'Thành công' };

      mockAuthService.changePassword.mockResolvedValue(expectedResult);

      const result = await controller.changePassword(mockUser, dto);

      // Kiểm tra xem Controller có tách đúng ID ra không
      expect(authService.changePassword).toHaveBeenCalledWith('user-uuid', dto);
      expect(result).toEqual(expectedResult);
    });

    it('phải lấy đúng user.sub nếu token sử dụng chuẩn sub', async () => {
      const mockUser = { sub: 'user-uuid-sub', role: 'GUEST' };
      const dto = { currentPassword: 'old', newPassword: 'new' };

      await controller.changePassword(mockUser, dto);

      expect(authService.changePassword).toHaveBeenCalledWith('user-uuid-sub', dto);
    });
  });

  describe('forgotPassword', () => {
    it('phải gọi authService.forgotPassword', async () => {
      const dto = { email: 'test@gmail.com' };
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'Đã gửi OTP' });

      await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('resetPassword', () => {
    it('phải gọi authService.resetPassword', async () => {
      const dto = { email: 'test@gmail.com', otp: '123456', newPassword: 'new' };
      mockAuthService.resetPassword.mockResolvedValue({ message: 'Thành công' });

      await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('sendGuestOtp', () => {
    it('phải truyền đúng tham số email dạng string xuống service', async () => {
      const email = 'guest@gmail.com';
      await controller.sendGuestOtp(email);
      expect(authService.sendGuestOtp).toHaveBeenCalledWith(email);
    });
  });

  describe('verifyGuestOtp', () => {
    it('phải bóc tách đúng thuộc tính email và otp từ body để truyền xuống service', async () => {
      const body = { email: 'guest@gmail.com', otp: '654321' };
      await controller.verifyGuestOtp(body);
      expect(authService.verifyGuestOtp).toHaveBeenCalledWith(body.email, body.otp);
    });
  });
});