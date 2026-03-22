import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Lấy token từ header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Token hết hạn là từ chối luôn
      secretOrKey: process.env.jwtSecret!, // CHÚ Ý: Thực tế phải để trong file .env
    });
  }

  // Nếu Token hợp lệ, nó sẽ tự động chạy vào hàm validate này
  async validate(payload: any) {
    // Giá trị return ở đây sẽ tự động được nhét vào biến `req.user`
    return { 
      id: payload.sub, 
      email: payload.email, 
      role: payload.role,
      hotelIds: payload.hotelIds
    };
  }
}