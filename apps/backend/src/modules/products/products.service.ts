import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductImageKind, ProductStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddImageDto } from './dto/add-image.dto';
import { UpsertVariantDto } from './dto/upsert-variant.dto';
import { BrowseProductsDto } from './dto/browse-products.dto';

// Seller-visible fields for all product responses.
const SELLER_SELECT = {
  id: true,
  businessName: true,
  location: true,
  ratingAverage: true,
  ratingCount: true,
  salesCount: true,
} as const;

// Image + variant includes reused in multiple queries.
const PRODUCT_INCLUDES = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { orderBy: { size: 'asc' as const } },
  seller: { select: SELLER_SELECT },
  rootCategory: { select: { id: true, name: true, slug: true } },
  subStyle: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Create product (DRAFT) — Gate 1 enforced
  // ---------------------------------------------------------------------------

  async create(user: AuthUser, dto: CreateProductDto) {
    const seller = this.requireVerifiedSeller(user);

    await this.assertRootCategoryExists(dto.rootCategoryId);
    if (dto.subStyleId) await this.assertSubStyleBelongs(dto.subStyleId, dto.rootCategoryId);

    const { variants, attributesExtra, ...fields } = dto;

    const product = await this.prisma.product.create({
      data: {
        ...fields,
        sellerId: seller.id,
        attributesExtra: (attributesExtra as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        variants: variants?.length
          ? { create: variants.map((v) => ({ size: v.size, stockQty: v.stockQty })) }
          : undefined,
      },
      include: PRODUCT_INCLUDES,
    });

    return product;
  }

  // ---------------------------------------------------------------------------
  // Browse LIVE products (public)
  // ---------------------------------------------------------------------------

  async browse(dto: BrowseProductsDto) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.LIVE,
      ...(dto.department && { department: dto.department }),
      ...(dto.rootCategoryId && { rootCategoryId: dto.rootCategoryId }),
      ...(dto.subStyleId && { subStyleId: dto.subStyleId }),
      ...(dto.sellerId && { sellerId: dto.sellerId }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDES,
        orderBy: { createdAt: 'desc' },
        skip: dto.offset ?? 0,
        take: dto.limit ?? 20,
      }),
    ]);

    return { total, items };
  }

  // ---------------------------------------------------------------------------
  // Get single product (public — LIVE; or seller/admin can see own DRAFT)
  // ---------------------------------------------------------------------------

  async findOne(id: string, requestingUser?: AuthUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDES,
    });

    if (!product) throw new NotFoundException('Product not found');

    // Non-LIVE products are only visible to the owning seller or an admin.
    if (product.status !== ProductStatus.LIVE) {
      const canSee =
        requestingUser?.isAdmin ||
        requestingUser?.seller?.id === product.sellerId;
      if (!canSee) throw new NotFoundException('Product not found');
    }

    return product;
  }

  // ---------------------------------------------------------------------------
  // Update product (seller only, must own it, not SUSPENDED)
  // ---------------------------------------------------------------------------

  async update(user: AuthUser, id: string, dto: UpdateProductDto) {
    const product = await this.requireOwnedProduct(user, id);

    if (product.status === ProductStatus.SUSPENDED) {
      throw new ForbiddenException('Suspended products cannot be edited. Contact support.');
    }

    if (dto.rootCategoryId) await this.assertRootCategoryExists(dto.rootCategoryId);
    if (dto.subStyleId) {
      const rootId = dto.rootCategoryId ?? product.rootCategoryId;
      await this.assertSubStyleBelongs(dto.subStyleId, rootId);
    }

    const { attributesExtra, ...fields } = dto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...fields,
        ...(attributesExtra !== undefined && {
          attributesExtra: attributesExtra as Prisma.InputJsonValue,
        }),
      },
      include: PRODUCT_INCLUDES,
    });
  }

  // ---------------------------------------------------------------------------
  // Publish: DRAFT → LIVE (requires at least one FRONT image)
  // ---------------------------------------------------------------------------

  async publish(user: AuthUser, id: string) {
    const product = await this.requireOwnedProduct(user, id);

    if (product.status === ProductStatus.LIVE) {
      throw new BadRequestException('Product is already live');
    }
    if (product.status === ProductStatus.SUSPENDED) {
      throw new ForbiddenException('Suspended products cannot be published. Contact support.');
    }

    const hasFrontImage = product.images.some((img) => img.kind === ProductImageKind.FRONT);
    if (!hasFrontImage) {
      throw new BadRequestException(
        'A product needs at least one FRONT photo before it can go live. ' +
          'Add an image with kind=FRONT via POST /products/:id/images first.',
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.LIVE },
      include: PRODUCT_INCLUDES,
    });
  }

  // ---------------------------------------------------------------------------
  // Unpublish: LIVE → DRAFT (seller pulls listing)
  // ---------------------------------------------------------------------------

  async unpublish(user: AuthUser, id: string) {
    const product = await this.requireOwnedProduct(user, id);

    if (product.status !== ProductStatus.LIVE) {
      throw new BadRequestException('Product is not currently live');
    }

    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.DRAFT },
      include: PRODUCT_INCLUDES,
    });
  }

  // ---------------------------------------------------------------------------
  // Suspend (admin only)
  // ---------------------------------------------------------------------------

  async suspend(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.SUSPENDED },
      include: PRODUCT_INCLUDES,
    });
  }

  // ---------------------------------------------------------------------------
  // Delete (seller) — only DRAFT products; LIVE products must be unpublished first
  // ---------------------------------------------------------------------------

  async remove(user: AuthUser, id: string) {
    const product = await this.requireOwnedProduct(user, id);

    if (product.status === ProductStatus.LIVE) {
      throw new BadRequestException(
        'Unpublish the product first before deleting it.',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  // ---------------------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------------------

  async addImage(user: AuthUser, productId: string, dto: AddImageDto) {
    const product = await this.requireOwnedProduct(user, productId);
    if (product.status === ProductStatus.SUSPENDED) {
      throw new ForbiddenException('Cannot add images to a suspended product');
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        kind: dto.kind ?? ProductImageKind.FRONT,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeImage(user: AuthUser, productId: string, imageId: string) {
    await this.requireOwnedProduct(user, productId);

    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Image removed' };
  }

  // ---------------------------------------------------------------------------
  // Variants (upsert by size — idempotent so sellers can restock)
  // ---------------------------------------------------------------------------

  async upsertVariant(user: AuthUser, productId: string, dto: UpsertVariantDto) {
    await this.requireOwnedProduct(user, productId);

    return this.prisma.productVariant.upsert({
      where: { productId_size: { productId, size: dto.size } },
      create: { productId, size: dto.size, stockQty: dto.stockQty },
      update: { stockQty: dto.stockQty },
    });
  }

  async removeVariant(user: AuthUser, productId: string, variantId: string) {
    await this.requireOwnedProduct(user, productId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { message: 'Variant removed' };
  }

  // ---------------------------------------------------------------------------
  // Seller's own product list (including DRAFTs)
  // ---------------------------------------------------------------------------

  async myProducts(user: AuthUser, dto: BrowseProductsDto) {
    const seller = this.requireVerifiedSeller(user);

    const where: Prisma.ProductWhereInput = {
      sellerId: seller.id,
      ...(dto.department && { department: dto.department }),
      ...(dto.rootCategoryId && { rootCategoryId: dto.rootCategoryId }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDES,
        orderBy: { createdAt: 'desc' },
        skip: dto.offset ?? 0,
        take: dto.limit ?? 20,
      }),
    ]);

    return { total, items };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private requireVerifiedSeller(user: AuthUser) {
    if (!user.seller) {
      throw new ForbiddenException(
        'You need a seller profile to manage products. Call POST /sellers/onboard first.',
      );
    }
    if (user.seller.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Your seller account must be Gate 1 verified before you can list products. ' +
          'Complete CNIC verification and wait for admin approval.',
      );
    }
    return user.seller;
  }

  private async requireOwnedProduct(user: AuthUser, productId: string) {
    if (!user.seller) {
      throw new ForbiddenException('Seller profile required');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, variants: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    if (product.sellerId !== user.seller.id && !user.isAdmin) {
      throw new ForbiddenException('You do not own this product');
    }

    return product;
  }

  private async assertRootCategoryExists(id: string) {
    const cat = await this.prisma.rootCategory.findUnique({ where: { id } });
    if (!cat) throw new BadRequestException(`Root category ${id} does not exist`);
    if (!cat.isActive) throw new BadRequestException('That category is not currently active');
  }

  private async assertSubStyleBelongs(subStyleId: string, rootCategoryId: string) {
    const sub = await this.prisma.subStyle.findUnique({ where: { id: subStyleId } });
    if (!sub) throw new BadRequestException(`Sub-style ${subStyleId} does not exist`);
    if (sub.rootCategoryId !== rootCategoryId) {
      throw new BadRequestException('Sub-style does not belong to the given root category');
    }
    if (!sub.isActive) throw new BadRequestException('That sub-style is not currently active');
  }
}
