import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewSellerDto } from './dto/review-seller.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Seller Gate 1 review queue
  // ---------------------------------------------------------------------------

  /** All sellers whose documents have been submitted and are awaiting admin review. */
  listPendingSellers() {
    return this.prisma.seller.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: { user: { select: { id: true, email: true, phone: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** All sellers, optionally filtered by verification status. */
  listSellers(status?: VerificationStatus) {
    return this.prisma.seller.findMany({
      where: status ? { verificationStatus: status } : undefined,
      include: { user: { select: { id: true, email: true, phone: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSeller(id: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, phone: true, fullName: true } } },
    });
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);
    return seller;
  }

  /**
   * Gate 1 approval / rejection.
   * VERIFIED → seller can now list products.
   * REJECTED → seller is blocked; they must appeal via support.
   */
  async reviewSeller(id: string, dto: ReviewSellerDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);

    if (seller.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Seller is already verified');
    }

    return this.prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: dto.decision,
        verifiedAt: dto.decision === VerificationStatus.VERIFIED ? new Date() : null,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Overview metrics (simple internal dashboard, spec Section 10)
  // ---------------------------------------------------------------------------

  async getDashboard() {
    const [totalSellers, pendingSellers, verifiedSellers, totalProducts, liveProducts] =
      await Promise.all([
        this.prisma.seller.count(),
        this.prisma.seller.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
        this.prisma.seller.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: 'LIVE' } }),
      ]);

    return {
      sellers: { total: totalSellers, pending: pendingSellers, verified: verifiedSellers },
      products: { total: totalProducts, live: liveProducts },
    };
  }
}
