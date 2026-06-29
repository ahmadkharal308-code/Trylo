import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AdminService } from './admin.service';
import { ReviewSellerDto } from './dto/review-seller.dto';

/**
 * Internal admin endpoints. Protected by both JWT (authenticated) and AdminGuard
 * (isAdmin flag on the user). These are not buyer-facing — they exist so the
 * Trylo team can review Gate 1 submissions and approve/reject sellers.
 *
 * To make a user an admin: UPDATE users SET "isAdmin" = true WHERE id = '<uuid>';
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /// High-level snapshot for the founder dashboard.
  @Get('dashboard')
  dashboard() {
    return this.admin.getDashboard();
  }

  /// List sellers, optionally filtered: ?status=PENDING | VERIFIED | REJECTED | UNVERIFIED
  @Get('sellers')
  listSellers(@Query('status') status?: VerificationStatus) {
    return this.admin.listSellers(status);
  }

  /// Shortcut: sellers waiting for Gate 1 review (same as ?status=PENDING).
  @Get('sellers/pending')
  listPending() {
    return this.admin.listPendingSellers();
  }

  /// Full detail for one seller (documents, CNIC, contact info).
  @Get('sellers/:id')
  getSeller(@Param('id') id: string) {
    return this.admin.getSeller(id);
  }

  /**
   * Gate 1 decision: approve or reject a seller.
   * Body: { "decision": "VERIFIED" | "REJECTED", "note": "optional internal note" }
   * After VERIFIED the seller can create product listings.
   */
  @Patch('sellers/:id/review')
  reviewSeller(@Param('id') id: string, @Body() dto: ReviewSellerDto) {
    return this.admin.reviewSeller(id, dto);
  }
}
