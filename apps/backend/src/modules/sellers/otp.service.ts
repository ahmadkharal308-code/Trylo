import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const OTP_TTL_MINUTES = 10;
const OTP_RATE_LIMIT_MINUTES = 1;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    const normalised = normalisePhone(phone);

    // Prevent rapid re-sends: one OTP per minute per phone
    const recent = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalised,
        createdAt: { gte: minutesAgo(OTP_RATE_LIMIT_MINUTES) },
      },
    });
    if (recent) {
      throw new BadRequestException(
        `Please wait ${OTP_RATE_LIMIT_MINUTES} minute before requesting another code`,
      );
    }

    const code = generateCode();
    const expiresAt = minutesFromNow(OTP_TTL_MINUTES);

    await this.prisma.otpVerification.create({
      data: { phone: normalised, code, expiresAt },
    });

    await this.deliver(normalised, code);
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const normalised = normalisePhone(phone);

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: normalised,
        code,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Mark used so it cannot be replayed
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  private async deliver(phone: string, code: string): Promise<void> {
    const provider = this.config.get<string>('SMS_PROVIDER', 'stub');

    if (provider === 'stub') {
      // STUB: in development, log the code instead of sending an SMS.
      // Replace this block by implementing a real SmsProvider when you pick a vendor.
      // See .env.example for provider options (Twilio, Infobip, Jazz/Telenor direct).
      this.logger.warn(
        `[OTP STUB] Would SMS ${phone}: your Trylo verification code is ${code} (expires in ${OTP_TTL_MINUTES} min)`,
      );
      return;
    }

    // TODO: implement real SMS providers here as needed.
    // Each provider should be a small class that accepts (phone, message) and handles
    // its own auth/retry logic. The stub above is the only delivery path until then.
    throw new Error(`SMS provider "${provider}" is not implemented yet`);
  }
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalisePhone(phone: string): string {
  if (phone.startsWith('0')) return '+92' + phone.slice(1);
  return phone;
}

function minutesFromNow(n: number): Date {
  return new Date(Date.now() + n * 60 * 1000);
}

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}
