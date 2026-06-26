import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  getPendingSellers() {
    return this.prisma.seller.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: {
        user: { select: { fullName: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveSeller(id: string): Promise<void> {
    await this.assertExists(id);
    await this.prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        phoneVerified: true,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });
    this.logger.log(`Seller approved: sellerId=${id}`);
  }

  async rejectSeller(id: string, reason: string): Promise<void> {
    await this.assertExists(id);
    await this.prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.REJECTED,
        rejectionReason: reason?.trim() || 'No reason provided',
      },
    });
    this.logger.log(`Seller rejected: sellerId=${id}`);
  }

  private async assertExists(id: string): Promise<void> {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException(`Seller ${id} not found`);
  }
}
