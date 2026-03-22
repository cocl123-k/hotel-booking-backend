import { Injectable, ConflictException, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PartnerStatus, User, UserRole } from './users.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getPendingPartners() {
    return await this.userRepository.find({
      where: { partnerStatus: PartnerStatus.PENDING },
      order: { createdAt: 'DESC' }
    });
  }

  // 2. Tìm User bằng Email (Hàm này cực kỳ quan trọng để module Auth gọi lúc Đăng nhập)
  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  // 3. Lấy thông tin 1 User (Xem Profile)
  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    
    return user;
  }

  // 4. Cập nhật thông tin User
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    
    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);
    
    return updatedUser;
  }

  async findByEmailWithHotels(email: string) {
    return await this.userRepository.findOne({ 
      where: { email },
      relations: ['hotels'] // <--- Lấy kèm danh sách khách sạn họ sở hữu
    });
  }

  async approvePartner(userId: string) {
    const user = await this.findOne(userId);
    
    if (user.role === UserRole.PARTNER) {
      throw new ConflictException('Tài khoản này đã là đối tác rồi!');
    }

    user.role = UserRole.PARTNER;
    user.partnerStatus = PartnerStatus.APPROVED;
    await this.userRepository.save(user);

    return { message: `Đã cấp quyền ĐỐI TÁC thành công cho user: ${user.email}` };
  }

  async rejectPartner(userId: string) {
    const user = await this.findOne(userId); 
    
    if (user.partnerStatus !== PartnerStatus.PENDING) {
      throw new ConflictException('Chỉ có thể từ chối tài khoản đang ở trạng thái chờ duyệt!');
    }

    // Đổi trạng thái sang REJECTED, giữ nguyên quyền là GUEST
    user.partnerStatus = PartnerStatus.REJECTED;
    await this.userRepository.save(user);

    return { message: `Đã từ chối yêu cầu Đối tác của user: ${user.email}` };
  }

  async findAll(role?: string) {
    if (role) {
      return await this.userRepository.find({ 
        where: { role: role as UserRole },
        order: { createdAt: 'DESC' } // Sắp xếp người mới nhất lên đầu
      });
    }
    return await this.userRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

async saveUser(data: DeepPartial<User>): Promise<User> {
  // save() sẽ tự hiểu và trả về đúng 1 đối tượng User nếu bạn truyền vào 1 đối tượng
  const savedUser = await this.userRepository.save(data);
  
  // Nếu vẫn bị báo lỗi gạch đỏ ở return, hãy dùng:
  return savedUser as unknown as User; 
}

  async savePartner(data: any) {
    const user = this.userRepository.create({
      ...data,
      role: UserRole.GUEST, // Vẫn là GUEST cho đến khi được Admin duyệt
      partnerStatus: PartnerStatus.PENDING,
    });
    return await this.userRepository.save(user);
  }
  async updateOtp(userId: string, otp: string | null, expires?: Date | null) {
    return await this.userRepository.update(userId, {
      otpCode: otp,
      otpExpires: expires,
      otpAttempts: 0 // Reset số lần thử
    });
  }

  // Hàm tăng số lần nhập sai
  async incrementOtpAttempts(userId: string) {
    return await this.userRepository.increment({ id: userId }, 'otpAttempts', 1);
  }

  // Xóa trắng dữ liệu OTP sau khi thành công
  async clearOtp(userId: string, passwordHash: string) {
    return await this.userRepository.update(userId, {
      passwordHash,
      otpCode: null,
      otpExpires: null,
      otpAttempts: 0
    });
  }
}