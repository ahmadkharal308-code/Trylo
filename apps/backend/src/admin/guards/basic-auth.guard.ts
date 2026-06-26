import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

// Hash both sides before comparing so timingSafeEqual works regardless of length
function safeEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const authHeader = req.headers['authorization'] ?? '';
    if (!authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Trylo Admin"');
      throw new UnauthorizedException('Admin authentication required');
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString(
      'utf-8',
    );
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Trylo Admin"');
      throw new UnauthorizedException();
    }

    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    const expectedUser = this.config.get<string>('ADMIN_USERNAME', '');
    const expectedPass = this.config.get<string>('ADMIN_PASSWORD', '');

    if (!expectedUser || !expectedPass) {
      // Misconfigured server — fail closed, never open
      throw new UnauthorizedException(
        'Admin credentials are not configured on this server',
      );
    }

    if (!safeEquals(username, expectedUser) || !safeEquals(password, expectedPass)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Trylo Admin"');
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return true;
  }
}
