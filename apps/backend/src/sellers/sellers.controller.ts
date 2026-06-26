import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { SellersService } from './sellers.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

const sellerDocStorage = diskStorage({
  destination: './uploads/seller-docs',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post('apply')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cnicDocument', maxCount: 1 },
        { name: 'businessProof', maxCount: 1 },
      ],
      {
        storage: sellerDocStorage,
        fileFilter: (_req, file, cb) => {
          if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new Error('Only JPEG, PNG, and PDF files are accepted'),
              false,
            );
          }
        },
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      },
    ),
  )
  apply(
    @Body() dto: ApplySellerDto,
    @UploadedFiles()
    files: {
      cnicDocument?: Express.Multer.File[];
      businessProof?: Express.Multer.File[];
    },
  ) {
    return this.sellersService.apply(dto, files ?? {});
  }
}
