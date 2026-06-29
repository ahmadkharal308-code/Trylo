import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { OnboardSellerDto } from './dto/onboard-seller.dto';
import { SubmitDocumentsDto } from './dto/submit-documents.dto';
import { AuthUser } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
  ) {}

  // ---------------------------------------------------------------------------
  // Step 1 — Create seller profile (name, location)
  // ---------------------------------------------------------------------------

  async onboard(user: AuthUser, dto: OnboardSellerDto) {
    if (user.seller) {
      throw new ConflictException('You already have a seller profile');
    }
    const seller = await this.prisma.seller.create({
      data: {
        userId: user.id,
        businessName: dto.businessName,
        location: dto.location,
        addressLine: dto.addressLine ?? null,
      },
    });
    return seller;
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Submit CNIC + optional business proof documents
  // ---------------------------------------------------------------------------

  async submitDocuments(user: AuthUser, dto: SubmitDocumentsDto) {
    const seller = this.requireSeller(user);
    this.requireNotVerified(seller.verificationStatus);

    const normalisedCnic = dto.cnicNumber.replace(/-/g, '');

    return this.prisma.seller.update({
      where: { id: seller.id },
      data: {
        cnicNumber: normalisedCnic,
        cnicDocumentUrl: dto.cnicDocumentUrl,
        businessProofUrl: dto.businessProofUrl ?? null,
        // Move to PENDING once docs are submitted (awaits admin Gate 1 approval)
        verificationStatus: VerificationStatus.PENDING,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Step 3a — Request phone OTP
  // ---------------------------------------------------------------------------

  async requestPhoneOtp(user: AuthUser, phone: string) {
    this.requireSeller(user);

    // In dev/stub mode the code is logged to console (see OtpService).
    await this.otp.sendOtp(phone);
    return { message: 'Verification code sent' };
  }

  // ---------------------------------------------------------------------------
  // Step 3b — Confirm phone OTP
  // ---------------------------------------------------------------------------

  async confirmPhoneOtp(user: AuthUser, phone: string, code: string) {
    const seller = this.requireSeller(user);

    await this.otp.verifyOtp(phone, code);

    // Record phone on the user record and mark phone as verified on the seller
    const normalised = phone.startsWith('0') ? '+92' + phone.slice(1) : phone;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { phone: normalised },
    });
    return this.prisma.seller.update({
      where: { id: seller.id },
      data: { phoneVerified: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Read own seller profile
  // ---------------------------------------------------------------------------

  async getMyProfile(user: AuthUser) {
    return this.requireSeller(user);
  }

  getVerificationChecklist(user: AuthUser) {
    const seller = this.requireSeller(user);
    return {
      profileCreated: true,
      documentsSubmitted: !!seller.cnicNumber,
      phoneVerified: seller.phoneVerified,
      gate1Approved: seller.verificationStatus === VerificationStatus.VERIFIED,
      verificationStatus: seller.verificationStatus,
      // A seller is allowed to list products only after Gate 1 is fully cleared.
      canListProducts: seller.verificationStatus === VerificationStatus.VERIFIED,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private requireSeller(user: AuthUser) {
    if (!user.seller) {
      throw new NotFoundException(
        'No seller profile found. Call POST /sellers/onboard first.',
      );
    }
    return user.seller;
  }

  private requireNotVerified(status: VerificationStatus) {
    if (status === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Your seller account is already verified');
    }
    if (status === VerificationStatus.REJECTED) {
      throw new ForbiddenException(
        'Your verification was rejected. Please contact support to appeal.',
      );
    }
  }
}
