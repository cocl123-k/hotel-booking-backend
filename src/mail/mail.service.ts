import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Cấu hình Transporter. 
    // LƯU Ý: Trong thực tế, các thông tin user/pass nên được lấy từ file .env
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Sử dụng Gmail
      auth: {
        user: process.env.mail, // Thay bằng email Gmail của bạn
        pass: process.env.mailPassword, // Thay bằng MẬT KHẨU ỨNG DỤNG (Không phải mật khẩu đăng nhập)
      },
    });
  }

  // Hàm gửi mã OTP
  async sendOtpEmail(toEmail: string, otpCode: string) {
    try {
      const mailOptions = {
        from: '"StayEase Support" <email-cua-ban@gmail.com>', // Tên người gửi
        to: toEmail, // Email người nhận
        subject: 'Mã xác nhận (OTP) khôi phục mật khẩu - StayEase',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">StayEase</h2>
            <p style="font-size: 16px; color: #333;">Chào bạn,</p>
            <p style="font-size: 16px; color: #333;">Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản đối tác trên hệ thống StayEase. Dưới đây là mã xác nhận (OTP) của bạn:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; background-color: #f1f5f9; padding: 10px 20px; border-radius: 8px;">
                ${otpCode}
              </span>
            </div>
            
            <p style="font-size: 14px; color: #ef4444; font-weight: bold;">Lưu ý: Mã này chỉ có hiệu lực trong vòng 5 phút.</p>
            <p style="font-size: 14px; color: #64748b;">Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này để đảm bảo an toàn cho tài khoản.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              © 2026 StayEase Partner System. All rights reserved.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Không thể gửi email lúc này, vui lòng thử lại sau!');
    }
  }

  async sendGuestBookingOtpEmail(toEmail: string, otpCode: string) {
    try {
      const mailOptions = {
        from: '"StayEase" <email-cua-ban@gmail.com>', // Nhớ thay email của bạn
        to: toEmail,
        subject: 'Mã xác nhận truy cập StayEase',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">StayEase</h2>
            <p style="font-size: 16px; color: #333;">Chào bạn,</p>
            <p style="font-size: 16px; color: #333;">Dưới đây là mã xác nhận (OTP) để tiếp tục quá trình đặt phòng hoặc tra cứu lịch sử chuyến đi của bạn:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; background-color: #f1f5f9; padding: 10px 20px; border-radius: 8px;">
                ${otpCode}
              </span>
            </div>
            
            <p style="font-size: 14px; color: #ef4444; font-weight: bold;">Lưu ý: Mã này chỉ có hiệu lực trong vòng 10 phút.</p>
            <p style="font-size: 14px; color: #64748b;">Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              © 2026 StayEase. All rights reserved.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      throw new InternalServerErrorException('Không thể gửi email lúc này, vui lòng thử lại sau!');
    }
  }
}