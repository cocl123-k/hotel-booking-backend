import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ==============================================================
  // 1. CẤU HÌNH CORS: Mở cổng kết nối cho Frontend (React Vite)
  // ==============================================================
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], // Chỉ đích danh địa chỉ của React Vite được phép gọi vào
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Các hành động được phép
    credentials: true, // Cực kỳ quan trọng: Cho phép trình duyệt gửi kèm Token (Bearer Auth)
  });

  // ==============================================================
  // 2. BẬT BỘ LỌC DỮ LIỆU ĐẦU VÀO (DTO Validation)
  // ==============================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động cắt bỏ những data rác mà Hacker cố tình gửi lên (không có trong DTO)
      transform: true, // Tự động ép kiểu (VD: Biến string '1' trên URL thành number 1)
    }),
  );

  // ==============================================================
  // 3. BẬT BỘ LỌC DỮ LIỆU ĐẦU RA (Giấu Mật khẩu)
  // ==============================================================
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // 4. Khởi động Server ở Port 3000
  await app.listen(3000);
  console.log('🚀 Backend StayEase đã chạy tại: http://localhost:3000');
}
bootstrap();