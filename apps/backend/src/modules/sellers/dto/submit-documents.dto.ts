import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

export class SubmitDocumentsDto {
  /// Pakistan CNIC: 13 digits, with or without dashes (XXXXX-XXXXXXX-X).
  @IsString()
  @Matches(/^[0-9]{5}-?[0-9]{7}-?[0-9]$/, {
    message: 'cnicNumber must be a valid Pakistan CNIC (e.g. 35202-1234567-1)',
  })
  cnicNumber: string;

  /// URL of the uploaded CNIC scan/photo (stored in S3-compatible object storage).
  @IsUrl()
  cnicDocumentUrl: string;

  /// Optional business registration document URL (NTN, partnership deed, etc.).
  @IsUrl()
  @IsOptional()
  businessProofUrl?: string;
}
