import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplySellerDto } from './dto/apply-seller.dto';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(
    dto: ApplySellerDto,
    files: {
      cnicDocument?: Express.Multer.File[];
      businessProof?: Express.Multer.File[];
    },
  ): Promise<{ message: string; sellerId: string }> {
    const cnicFile = files.cnicDocument?.[0];
    if (!cnicFile) {
      throw new BadRequestException('CNIC photo is required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { seller: true },
    });

    if (existingUser?.seller) {
      const { verificationStatus } = existingUser.seller;
      if (verificationStatus === VerificationStatus.PENDING) {
        throw new ConflictException('Your application is already under review');
      }
      if (verificationStatus === VerificationStatus.VERIFIED) {
        throw new ConflictException('This seller account is already verified');
      }
      // REJECTED sellers may resubmit with new documents — falls through to update below
    }

    // Build URL paths — stored as-is; never written to any logger
    const cnicDocumentUrl = `/uploads/seller-docs/${cnicFile.filename}`;
    const businessProofFile = files.businessProof?.[0];
    const businessProofUrl = businessProofFile
      ? `/uploads/seller-docs/${businessProofFile.filename}`
      : null;

    const sellerPayload = {
      businessName: dto.businessName,
      location: dto.location,
      addressLine: dto.addressLine ?? null,
      verificationStatus: VerificationStatus.PENDING,
      cnicNumber: dto.cnicNumber,
      cnicDocumentUrl,
      businessProofUrl,
      rejectionReason: null,
    };

    const seller = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        if (!existingUser.fullName) {
          await tx.user.update({
            where: { id: userId },
            data: { fullName: dto.fullName },
          });
        }
      } else {
        const newUser = await tx.user.create({
          data: { phone: dto.phone, fullName: dto.fullName },
        });
        userId = newUser.id;
      }

      if (existingUser?.seller) {
        return tx.seller.update({
          where: { id: existingUser.seller.id },
          data: sellerPayload,
        });
      }

      return tx.seller.create({
        data: { userId, ...sellerPayload },
      });
    });

    // Only log the non-sensitive ID — cnicNumber and file paths are never logged
    this.logger.log(`Seller application submitted: sellerId=${seller.id}`);

    return {
      message:
        'Application submitted successfully. We will review your documents and be in touch.',
      sellerId: seller.id,
    };
  }
}
