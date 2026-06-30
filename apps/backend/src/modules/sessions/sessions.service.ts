import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Department,
  Formality,
  Pattern,
  Prisma,
  ProductStatus,
  SwipeDirection,
  SwipePhase,
  Tone,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { RecordSwipeDto } from './dto/record-swipe.dto';

// Phase lengths (spec Section 5).
const BENCHMARK_COUNT = 3;
const CONFIRMATION_COUNT = 2;
const TOTAL_SWIPES = BENCHMARK_COUNT + CONFIRMATION_COUNT;

// Scoring weights per phase and direction.
// UP ("maybe") is always a REDUCED-WEIGHT POSITIVE signal — never negative (spec + CLAUDE.md #7).
function computeWeight(direction: SwipeDirection, phase: SwipePhase): number {
  const baseWeight = phase === SwipePhase.BENCHMARK ? 2 : 1;
  if (direction === SwipeDirection.RIGHT) return baseWeight;
  if (direction === SwipeDirection.UP) return baseWeight * 0.5; // positive, half weight
  return -baseWeight; // LEFT
}

// Minimum seller fields always returned alongside a product (CLAUDE.md constraint #5).
const SELLER_SELECT = {
  id: true,
  businessName: true,
  location: true,
  ratingAverage: true,
  ratingCount: true,
  salesCount: true,
} as const;

const PRODUCT_INCLUDES = {
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 }, // one image per card
  variants: { orderBy: { size: 'asc' as const } },
  seller: { select: SELLER_SELECT },
  rootCategory: { select: { id: true, name: true, slug: true } },
  subStyle: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Start a new session
  // ---------------------------------------------------------------------------

  async create(user: AuthUser, dto: CreateSessionDto) {
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        department: dto.department,
      },
    });

    // Update user's last-seen department preference.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastDepartment: dto.department },
    });

    return this.enrichSession(session.id);
  }

  // ---------------------------------------------------------------------------
  // Get session state
  // ---------------------------------------------------------------------------

  async getSession(user: AuthUser, sessionId: string) {
    await this.requireOwnSession(user, sessionId);
    return this.enrichSession(sessionId);
  }

  // ---------------------------------------------------------------------------
  // Get next product to swipe
  //
  // BENCHMARK: variety-enforced — different sellers and sub-styles from what
  //   has already been shown (CLAUDE.md constraint #4).
  // CONFIRMATION: products matching the liked attributes from benchmark swipes.
  // ---------------------------------------------------------------------------

  async getNext(user: AuthUser, sessionId: string) {
    const session = await this.requireOwnSession(user, sessionId);

    if (session.endedAt) {
      throw new BadRequestException('This session has ended');
    }
    if (session.skippedSwiping) {
      throw new BadRequestException('This session was skipped to results');
    }

    const swipes = await this.prisma.swipeEvent.findMany({
      where: { sessionId },
      include: { product: true },
    });

    const phase = this.derivePhase(swipes.length);

    if (phase === 'COMPLETE') {
      throw new BadRequestException('Swiping is complete for this session. Fetch your results.');
    }

    const seenIds = swipes.map((s) => s.productId);

    const product =
      phase === SwipePhase.BENCHMARK
        ? await this.pickBenchmarkProduct(session.department, seenIds, swipes)
        : await this.pickConfirmationProduct(session.department, seenIds, swipes);

    if (!product) {
      throw new NotFoundException(
        'No more products available for this category. Try a different department or category.',
      );
    }

    return {
      phase,
      swipeNumber: swipes.length + 1,
      totalSwipes: TOTAL_SWIPES,
      product,
    };
  }

  // ---------------------------------------------------------------------------
  // Record a swipe
  // ---------------------------------------------------------------------------

  async recordSwipe(user: AuthUser, sessionId: string, dto: RecordSwipeDto) {
    const session = await this.requireOwnSession(user, sessionId);

    if (session.endedAt) throw new BadRequestException('Session has ended');
    if (session.skippedSwiping) throw new BadRequestException('Session was skipped to results');

    const swipes = await this.prisma.swipeEvent.findMany({ where: { sessionId } });

    if (swipes.length >= TOTAL_SWIPES) {
      throw new BadRequestException('All swipes for this session are already recorded');
    }

    // Prevent duplicate swipes on the same product.
    if (swipes.some((s) => s.productId === dto.productId)) {
      throw new BadRequestException('This product has already been swiped in this session');
    }

    // Verify the product exists and is LIVE.
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.status !== ProductStatus.LIVE) {
      throw new NotFoundException('Product not found');
    }

    const phase = this.derivePhase(swipes.length);
    if (phase === 'COMPLETE') {
      throw new BadRequestException('Swiping is already complete for this session');
    }

    const weight = computeWeight(dto.direction, phase as SwipePhase);

    const swipeEvent = await this.prisma.swipeEvent.create({
      data: {
        sessionId,
        userId: user.id,
        productId: dto.productId,
        direction: dto.direction,
        phase: phase as SwipePhase,
        weight: new Prisma.Decimal(weight),
      },
      include: { product: true },
    });

    const newCount = swipes.length + 1;
    const newPhase = this.derivePhase(newCount);
    const isComplete = newPhase === 'COMPLETE';

    // Auto-end session when all swipes are done.
    if (isComplete) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });
    }

    return {
      swipeEvent,
      phase: newPhase,
      swipeCount: newCount,
      isComplete,
      message: isComplete
        ? 'Swiping complete — fetch your results from GET /sessions/:id/results'
        : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Skip to results (spec Section 5 — opt-out of swiping)
  // ---------------------------------------------------------------------------

  async skip(user: AuthUser, sessionId: string) {
    const session = await this.requireOwnSession(user, sessionId);

    if (session.endedAt) throw new BadRequestException('Session has already ended');
    if (session.skippedSwiping) throw new BadRequestException('Already skipped');

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { skippedSwiping: true, endedAt: new Date() },
    });

    return {
      message: 'Skipped to results. Fetching will use variety-enforced defaults.',
      sessionId,
    };
  }

  // ---------------------------------------------------------------------------
  // Results — lightweight recommendation preview (full engine is Milestone 6)
  //
  // CLAUSE.md constraint #4: when there is no signal, enforce variety.
  // CLAUSE.md constraint #5: seller identity always included.
  // ---------------------------------------------------------------------------

  async getResults(user: AuthUser, sessionId: string) {
    const session = await this.requireOwnSession(user, sessionId);

    if (!session.endedAt) {
      throw new BadRequestException(
        'Session is not complete yet. Finish swiping or call POST /sessions/:id/skip first.',
      );
    }

    const swipes = await this.prisma.swipeEvent.findMany({
      where: { sessionId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    const seenIds = swipes.map((s) => s.productId);

    // If skipped or no positive swipes: variety-enforced defaults (constraint #4).
    const positiveSwipes = swipes.filter(
      (s) => s.direction === SwipeDirection.RIGHT || s.direction === SwipeDirection.UP,
    );

    let products;
    if (positiveSwipes.length === 0 || session.skippedSwiping) {
      products = await this.varietyFallback(session.department, seenIds, 20);
    } else {
      products = await this.buildResults(session.department, positiveSwipes, seenIds, 20);
    }

    return {
      sessionId,
      department: session.department,
      basedOnSwipes: swipes.length,
      skipped: session.skippedSwiping,
      items: products,
    };
  }

  // ---------------------------------------------------------------------------
  // Picking helpers
  // ---------------------------------------------------------------------------

  private async pickBenchmarkProduct(
    department: Department,
    seenIds: string[],
    existingSwipes: Array<{ product: { sellerId: string; subStyleId: string | null } }>,
  ) {
    // Enforce variety: avoid sellers and sub-styles already shown.
    const seenSellerIds = existingSwipes.map((s) => s.product.sellerId);
    const seenSubStyleIds = existingSwipes
      .map((s) => s.product.subStyleId)
      .filter((id): id is string => id !== null);

    // Try to find a product from an unseen seller AND unseen sub-style.
    const product = await this.prisma.product.findFirst({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: seenIds.length ? { notIn: seenIds } : undefined,
        sellerId: seenSellerIds.length ? { notIn: seenSellerIds } : undefined,
        subStyleId: seenSubStyleIds.length ? { notIn: seenSubStyleIds } : undefined,
      },
      include: PRODUCT_INCLUDES,
      orderBy: { createdAt: 'desc' },
    });

    if (product) return product;

    // Relax: allow same sub-style but still different seller.
    const fallback1 = await this.prisma.product.findFirst({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: seenIds.length ? { notIn: seenIds } : undefined,
        sellerId: seenSellerIds.length ? { notIn: seenSellerIds } : undefined,
      },
      include: PRODUCT_INCLUDES,
      orderBy: { createdAt: 'desc' },
    });

    if (fallback1) return fallback1;

    // Last resort: any unseen LIVE product in this department.
    return this.prisma.product.findFirst({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: seenIds.length ? { notIn: seenIds } : undefined,
      },
      include: PRODUCT_INCLUDES,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async pickConfirmationProduct(
    department: Department,
    seenIds: string[],
    swipes: Array<{ direction: SwipeDirection; product: { pattern: string; tone: string; formality: string; sellerId: string } }>,
  ) {
    // Build a preference profile from positive benchmark swipes.
    const positiveSwipes = swipes.filter(
      (s) => s.direction === SwipeDirection.RIGHT || s.direction === SwipeDirection.UP,
    );

    if (positiveSwipes.length === 0) {
      // Nothing liked yet — still enforce variety.
      return this.pickBenchmarkProduct(department, seenIds, []);
    }

    // Find the most common liked attributes to match against.
    const likedPatterns = this.mostCommon(positiveSwipes.map((s) => s.product.pattern)) as Pattern[];
    const likedTones = this.mostCommon(positiveSwipes.map((s) => s.product.tone)) as Tone[];
    const likedFormalities = this.mostCommon(positiveSwipes.map((s) => s.product.formality)) as Formality[];

    // Try to find something matching liked attributes, from an unseen seller.
    const likedSellerIds = positiveSwipes.map((s) => s.product.sellerId);

    const match = await this.prisma.product.findFirst({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: seenIds.length ? { notIn: seenIds } : undefined,
        OR: [
          { pattern: { in: likedPatterns } },
          { tone: { in: likedTones } },
          { formality: { in: likedFormalities } },
        ],
        // Slight seller variety: try not to repeat a seller from positive swipes.
        sellerId: likedSellerIds.length ? { notIn: likedSellerIds } : undefined,
      },
      include: PRODUCT_INCLUDES,
      orderBy: { createdAt: 'desc' },
    });

    if (match) return match;

    // Relax seller restriction.
    return this.prisma.product.findFirst({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: seenIds.length ? { notIn: seenIds } : undefined,
        OR: [
          { pattern: { in: likedPatterns } },
          { tone: { in: likedTones } },
          { formality: { in: likedFormalities } },
        ],
      },
      include: PRODUCT_INCLUDES,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Results building
  // ---------------------------------------------------------------------------

  private async buildResults(
    department: Department,
    positiveSwipes: Array<{ weight: Prisma.Decimal; product: { pattern: string; tone: string; brightness: string; saturation: string; formality: string; coverage: string; cut: string } }>,
    excludeIds: string[],
    limit: number,
  ) {
    // Derive liked attributes weighted by swipe weight (heavier RIGHT > lighter UP).
    const patterns = this.weightedFrequency(positiveSwipes, (s) => s.product.pattern) as Pattern[];
    const tones = this.weightedFrequency(positiveSwipes, (s) => s.product.tone) as Tone[];
    const formalities = this.weightedFrequency(positiveSwipes, (s) => s.product.formality) as Formality[];

    const results = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: excludeIds.length ? { notIn: excludeIds } : undefined,
        OR: [
          { pattern: { in: patterns } },
          { tone: { in: tones } },
          { formality: { in: formalities } },
        ],
      },
      include: PRODUCT_INCLUDES,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // If not enough matched results, top up with variety fallback.
    if (results.length < limit) {
      const topUpIds = [...excludeIds, ...results.map((p) => p.id)];
      const topUp = await this.varietyFallback(department, topUpIds, limit - results.length);
      return [...results, ...topUp];
    }

    return results;
  }

  private async varietyFallback(department: Department, excludeIds: string[], limit: number) {
    // Constraint #4: variety-enforced defaults — must spread across sellers and sub-styles,
    // never dump all results from a single seller at the top.
    // Strategy: round-robin across sellers — fetch up to ceil(limit/sellerCount) per seller,
    // then interleave.

    // Get all unique seller IDs that have LIVE products in this department.
    const sellers = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: excludeIds.length ? { notIn: excludeIds } : undefined,
      },
      select: { sellerId: true },
      distinct: ['sellerId'],
    });

    const sellerIds = sellers.map((s) => s.sellerId);
    if (sellerIds.length === 0) return [];

    const perSeller = Math.ceil(limit / sellerIds.length);

    // Fetch a slice of products per seller in parallel.
    const buckets = await Promise.all(
      sellerIds.map((sellerId) =>
        this.prisma.product.findMany({
          where: {
            status: ProductStatus.LIVE,
            department,
            sellerId,
            id: excludeIds.length ? { notIn: excludeIds } : undefined,
          },
          include: PRODUCT_INCLUDES,
          orderBy: { createdAt: 'desc' },
          take: perSeller,
        }),
      ),
    );

    // Interleave: take one from each bucket until we hit the limit.
    const result = [];
    const maxLen = Math.max(...buckets.map((b) => b.length));
    outer: for (let i = 0; i < maxLen; i++) {
      for (const bucket of buckets) {
        if (bucket[i]) {
          result.push(bucket[i]);
          if (result.length >= limit) break outer;
        }
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private derivePhase(swipeCount: number): SwipePhase | 'COMPLETE' {
    if (swipeCount < BENCHMARK_COUNT) return SwipePhase.BENCHMARK;
    if (swipeCount < TOTAL_SWIPES) return SwipePhase.CONFIRMATION;
    return 'COMPLETE';
  }

  private async enrichSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        swipeEvents: {
          include: { product: { include: { images: { take: 1 }, seller: { select: SELLER_SELECT } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const swipeCount = session.swipeEvents.length;
    const phase = this.derivePhase(swipeCount);

    return {
      ...session,
      phase,
      swipeCount,
      benchmarkCount: BENCHMARK_COUNT,
      confirmationCount: CONFIRMATION_COUNT,
      totalSwipes: TOTAL_SWIPES,
      isComplete: phase === 'COMPLETE' || session.skippedSwiping,
    };
  }

  private async requireOwnSession(user: AuthUser, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('Not your session');
    }
    return session;
  }

  private mostCommon<T>(values: T[]): T[] {
    const freq = new Map<T, number>();
    values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
    const max = Math.max(...freq.values());
    return [...freq.entries()].filter(([, n]) => n === max).map(([v]) => v);
  }

  private weightedFrequency<T>(
    swipes: Array<{ weight: Prisma.Decimal; product: T }>,
    getter: (s: { weight: Prisma.Decimal; product: T }) => string,
  ): string[] {
    const freq = new Map<string, number>();
    swipes.forEach((s) => {
      const key = getter(s);
      freq.set(key, (freq.get(key) ?? 0) + Number(s.weight));
    });
    if (freq.size === 0) return [];
    const max = Math.max(...freq.values());
    // Return values with at least half the max weight (not just the single top value).
    return [...freq.entries()].filter(([, w]) => w >= max * 0.5).map(([k]) => k);
  }
}
