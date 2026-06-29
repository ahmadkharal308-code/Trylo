import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least one of email or phone is required');
    }

    // Check for existing account
    if (dto.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException('An account with this email already exists');
    }
    if (dto.phone) {
      const normalised = normalisePhone(dto.phone);
      const exists = await this.prisma.user.findUnique({ where: { phone: normalised } });
      if (exists) throw new ConflictException('An account with this phone number already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone ? normalisePhone(dto.phone) : null,
        passwordHash,
      },
    });

    return { user: sanitise(user), token: this.sign(user) };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const isPhone = /^(\+92|0)3/.test(identifier);

    const user = await this.prisma.user.findFirst({
      where: isPhone
        ? { phone: normalisePhone(identifier) }
        : { email: identifier },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return { user: sanitise(user), token: this.sign(user) };
  }

  private sign(user: { id: string; email?: string | null; phone?: string | null; isAdmin: boolean }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      isAdmin: user.isAdmin,
    };
    return this.jwt.sign(payload);
  }
}

function normalisePhone(phone: string): string {
  // Store all PK numbers in +92 format for consistency
  if (phone.startsWith('0')) return '+92' + phone.slice(1);
  return phone;
}

function sanitise(user: Record<string, unknown>) {
  // Never return the password hash to any client
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}
