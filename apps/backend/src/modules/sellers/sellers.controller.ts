import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../../auth/decorators/current-user.decorator';
import { SellersService } from './sellers.service';
import { OnboardSellerDto } from './dto/onboard-seller.dto';
import { SubmitDocumentsDto } from './dto/submit-documents.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';

@Controller('sellers')
@UseGuards(JwtAuthGuard)
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  /**
   * Step 1 of Gate 1.
   * Create a seller profile linked to the logged-in user (business name + location).
   * A user can only have one seller profile.
   */
  @Post('onboard')
  onboard(@CurrentUser() user: AuthUser, @Body() dto: OnboardSellerDto) {
    return this.sellers.onboard(user, dto);
  }

  /**
   * Step 2 of Gate 1.
   * Upload CNIC number + document URL (and optional business proof).
   * This moves the seller status to PENDING (awaiting admin review).
   */
  @Post('verify/documents')
  submitDocuments(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitDocumentsDto,
  ) {
    return this.sellers.submitDocuments(user, dto);
  }

  /**
   * Step 3a of Gate 1.
   * Request a 6-digit OTP sent to the given phone number.
   * In development (SMS_PROVIDER=stub) the code is logged to the console.
   */
  @Post('verify/phone/request')
  requestOtp(@CurrentUser() user: AuthUser, @Body() dto: RequestOtpDto) {
    return this.sellers.requestPhoneOtp(user, dto.phone);
  }

  /**
   * Step 3b of Gate 1.
   * Submit the OTP received by SMS to verify phone ownership.
   */
  @Post('verify/phone/confirm')
  confirmOtp(@CurrentUser() user: AuthUser, @Body() dto: ConfirmOtpDto) {
    return this.sellers.confirmPhoneOtp(user, dto.phone, dto.code);
  }

  /// Returns the logged-in seller's profile and Gate 1 status.
  @Get('me')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.sellers.getMyProfile(user);
  }

  /**
   * Returns a plain-language checklist of what the seller has completed and what
   * is still needed before they can list products.
   */
  @Get('me/checklist')
  getChecklist(@CurrentUser() user: AuthUser) {
    return this.sellers.getVerificationChecklist(user);
  }
}
