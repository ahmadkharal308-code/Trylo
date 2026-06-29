import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User, Seller } from '@prisma/client';

export type AuthUser = User & { seller: Seller | null };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user as AuthUser;
  },
);
