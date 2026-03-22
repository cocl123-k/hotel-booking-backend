import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../../mail/mail.service';
import { User, UserRole } from '../users/users.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService, // Công cụ sinh Token
  ) {}

  async login(loginDto: LoginDto) {
    // 1. Tìm User qua email (Gọi ké hàm từ UsersService)
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    // 2. So sánh mật khẩu client gửi lên với chuỗi băm trong Database
    const isPasswordMatching = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    const hotelIds = user.hotels ? user.hotels.map(hotel => hotel.id) : [];

    // 3. Tạo "Thẻ bài" (Payload) chứa thông tin cơ bản
    const payload = { 
      sub: user.id, // ID của user
      email: user.email, 
      role: user.role,
      hotelIds: hotelIds
    };

    // 4. Ký và trả về Token
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        hotelIds
      }
    };
  }

  async register(dto: CreateUserDto) {
    const { email, password, ...rest } = dto;

    // 1. Kiểm tra email tồn tại (Tận dụng hàm có sẵn của UsersService)
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng!');
    }

    // 2. Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Lưu vào DB thông qua UsersService
    return this.usersService.saveUser({
      ...rest,
      email,
      passwordHash: hashedPassword,
    });
  }

  // LOGIC ĐĂNG KÝ ĐỐI TÁC
  async registerPartner(dto: RegisterPartnerDto) {
    const { email, password, ...rest } = dto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Lưu với trạng thái PENDING (Chờ duyệt)
    return this.usersService.savePartner({
      ...rest,
      email,
      passwordHash: hashedPassword,
    });
  }
  
  async changePassword(userId: string, dto: ChangePasswordDto) {
    // 1. Tìm user thông qua UsersService (Hãy đảm bảo hàm findOne hoặc hàm tương đương được public bên UsersService)
    const user = await this.usersService.findOne(userId); 
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản!');

    // 2. Kiểm tra mật khẩu hiện tại
    const isPasswordMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác!');
    }

    // 3. Kiểm tra mật khẩu mới
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
    }

    // 4. Mã hóa và Lưu
    const salt = await bcrypt.genSalt();
    user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
    
    // Gọi hàm lưu từ UsersService (bạn có thể cần tạo thêm hàm saveUser bên UsersService nếu chưa có)
    await this.usersService.saveUser(user); 

    return { message: 'Đổi mật khẩu thành công!' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Email không tồn tại!');

    // 1. Tạo OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Thiết lập thời gian hết hạn (ví dụ: 5 phút)
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 5);

    // 3. Lưu OTP vào DB (Bạn cần tạo hàm này trong UsersService)
    await this.usersService.updateOtp(user.id, otp, expires);

    // 4. Gửi OTP này qua Email
    await this.mailService.sendOtpEmail(user.email, otp);

    return { 
      message: 'Mã OTP đã được gửi đến email của bạn.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.otpCode) {
      throw new BadRequestException('Yêu cầu không hợp lệ hoặc mã OTP đã hết hạn!');
    }

    // 1. Kiểm tra xem đã vượt quá số lần thử chưa (VD: tối đa 5 lần)
    if (user.otpAttempts >= 5) {
      // Vô hiệu hóa OTP luôn để bảo mật
      await this.usersService.updateOtp(user.id, null, null); 
      throw new BadRequestException('Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới!');
    }

    // 2. Kiểm tra thời gian hết hạn
    if (!user.otpExpires || new Date() > user.otpExpires) {
      throw new BadRequestException('Mã OTP đã hết hạn!');
    }

    // 3. Kiểm tra mã OTP
    if (user.otpCode !== dto.otp) {
      // Tăng số lần thử sai trong DB
      await this.usersService.incrementOtpAttempts(user.id);
      
      const remaining = 5 - (user.otpAttempts + 1);
      throw new BadRequestException(`Mã OTP không chính xác. Bạn còn ${remaining} lần thử!`);
    }

    // 4. Nếu đúng: Hash mật khẩu mới và dọn dẹp OTP
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.clearOtp(user.id, hashedPassword);

    return { message: 'Đổi mật khẩu thành công!' };
  }

  async sendGuestOtp(email: string) {
    // 1. Kiểm tra xem khách đã có trong hệ thống chưa
    let user = await this.usersService.findByEmail(email);
    
    // 2. Nếu là khách mới tinh -> Tạo ngầm 1 tài khoản GUEST
    if (!user) {
      user = await this.usersService.saveUser({
        email,
        fullName: 'Khách hàng',
        passwordHash: '', // Khách vãng lai không cần mật khẩu
        role: UserRole.GUEST,
      }) as User;
    }

    // 3. Sinh mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10); // Hạn 10 phút

    // 4. Lưu OTP vào DB và gửi Mail
    await this.usersService.updateOtp(user.id, otp, expires);
    
    // Gọi hàm gửi mail vừa tạo ở Bước 1
    await this.mailService.sendGuestBookingOtpEmail(user.email, otp); 

    return { message: 'Mã OTP đã được gửi đến email của bạn.' };
  }

  async verifyGuestOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.otpCode) {
      throw new BadRequestException('Yêu cầu không hợp lệ!');
    }

    if (user.otpAttempts >= 5) {
      await this.usersService.updateOtp(user.id, null, null); 
      throw new BadRequestException('Nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới!');
    }
    
    if (!user.otpExpires || new Date() > user.otpExpires) {
      throw new BadRequestException('Mã OTP đã hết hạn!');
    }
    
    if (user.otpCode !== otp) {
      await this.usersService.incrementOtpAttempts(user.id);
      throw new BadRequestException('Mã OTP không chính xác!');
    }

    // Xác thực thành công -> Xóa OTP
    await this.usersService.updateOtp(user.id, null, null); 

    // Cấp Token (Giống hệt lúc Login)
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        fullName: user.fullName, 
        email: user.email, 
        role: user.role 
      }
    };
  }
}