import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { OptionalJwtGuard } from '../../auth/guards/optional-jwt.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddImageDto } from './dto/add-image.dto';
import { UpsertVariantDto } from './dto/upsert-variant.dto';
import { BrowseProductsDto } from './dto/browse-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ---------------------------------------------------------------------------
  // Seller — create / manage own listings
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  myProducts(@CurrentUser() user: AuthUser, @Query() query: BrowseProductsDto) {
    return this.products.myProducts(user, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.publish(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.unpublish(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(user, id);
  }

  // ---------------------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  addImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddImageDto,
  ) {
    return this.products.addImage(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/images/:imageId')
  removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.products.removeImage(user, id, imageId);
  }

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post(':id/variants')
  upsertVariant(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertVariantDto,
  ) {
    return this.products.upsertVariant(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/variants/:variantId')
  removeVariant(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.products.removeVariant(user, id, variantId);
  }

  // ---------------------------------------------------------------------------
  // Admin — suspend a product
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.suspend(id);
  }

  // ---------------------------------------------------------------------------
  // Public — browse and view products
  // ---------------------------------------------------------------------------

  @UseGuards(OptionalJwtGuard)
  @Get()
  browse(@Query() query: BrowseProductsDto) {
    return this.products.browse(query);
  }

  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.findOne(id, user);
  }
}
