import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^(\+92|0)3[0-9]{9}$/, {
    message: 'phone must be a valid Pakistan mobile number (e.g. 03001234567)',
  })
  phone: string;
}
