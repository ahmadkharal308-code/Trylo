import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<{ user: User }>().user;
    if (!user?.isAdmin) throw new ForbiddenException('Admin access required');
    return true;
  }
}
