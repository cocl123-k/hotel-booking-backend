import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e) - Login Flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // RẤT QUAN TRỌNG: Phải bật ValidationPipe để các lỗi 400 (TC_6 -> TC_12) hoạt động
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ĐỊNH NGHĨA BỘ 14 TEST CASES (Y HỆT FILE CSV)
  const testCases = [
    { id: 'Tc_1', desc: 'Đăng nhập thành công', email: 'user1@gmail.com', pass: 'Abc@123456', expected: 201 },
    { id: 'Tc_2', desc: 'Email có khoảng trắng', email: ' user1@gmail.com ', pass: 'Abc@123456', expected: 201 },
    { id: 'Tc_3', desc: 'Sai mật khẩu', email: 'user1@gmail.com', pass: 'SaiPass@123', expected: 401 },
    { id: 'Tc_4', desc: 'Email chưa đăng ký', email: 'ghost@gmail.com', pass: 'Abc@123456', expected: 401 },
    { id: 'Tc_5', desc: 'Sai chữ hoa/thường pass', email: 'user1@gmail.com', pass: 'abc@123456', expected: 401 },
    { id: 'Tc_6', desc: 'Email null', email: null, pass: 'Abc@123456', expected: 400 },
    { id: 'Tc_7', desc: 'Password null', email: 'user1@gmail.com', pass: null, expected: 400 },
    { id: 'Tc_8', desc: 'Email rỗng', email: '', pass: 'Abc@123456', expected: 400 },
    { id: 'Tc_9', desc: 'Email thiếu @', email: 'user1gmail.com', pass: 'Abc@123456', expected: 400 },
    { id: 'Tc_10', desc: 'Email thiếu domain', email: 'user1@.com', pass: 'Abc@123456', expected: 400 },
    { id: 'Tc_11', desc: 'Email ký tự đặc biệt lạ', email: 'user1!#$@gmail.com', pass: 'Abc@123456', expected: 401 }, // Như đã thảo luận, chuẩn RFC cho là hợp lệ nên ra 401
    { id: 'Tc_12', desc: 'SQL Injection Email', email: "' OR 1=1 --", pass: 'Abc@123456', expected: 400 },
    { id: 'Tc_13', desc: 'SQL Injection Pass', email: 'user1@gmail.com', pass: "' OR '1'='1", expected: 401 },
    { id: 'Tc_14', desc: 'Dữ liệu quá dài', email: 'a'.repeat(200) + '@gmail.com', pass: 'Abc@123456', expected: 400 },
  ];

  // CHẠY TỰ ĐỘNG VÒNG LẶP TEST
  describe.each(testCases)('Kịch bản $id: $desc', ({ email, pass, expected }) => {
    it(`API nên trả về status code ${expected}`, () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: pass })
        .expect(expected)
        .expect((res) => {
          if (expected === 201) {
            expect(res.body).toHaveProperty('accessToken');
          } else {
            expect(res.body).toHaveProperty('message');
          }
        });
    });
  });
});