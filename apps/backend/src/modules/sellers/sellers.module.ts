import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { OtpService } from './otp.service';

@Module({
  providers: [SellersService, OtpService],
  controllers: [SellersController],
  exports: [SellersService],
})
export class SellersModule {}
