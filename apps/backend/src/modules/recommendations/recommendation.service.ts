import { Injectable } from '@nestjs/common';
import { Department, ProductStatus, SwipeDirection } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// The 8 universal scoring attributes (spec Section 6, Layer 1).
// Silhouette is excluded from this map because it's a free string, not a fixed enum —
// it still influences scoring but via exact-match rather than cross-product comparison.
const SCORED_ATTRS = [
  'pattern',
  'tone',
  'brightness',
  'saturation',
  'formality',
  'coverage',
  'cut',
] as const;

type ScoredAttr = (typeof SCORED_ATTRS)[number];

// Weight map: attribute → value → accumulated swipe weight.
type TasteProfile = Record<ScoredAttr, Map<string, number>> & {
  silhouette: Map<string, number>;
  totalWeight: number;
  swipeCount: number;
};

// After scoring, apply a seller diversity penalty so one seller never dominates the top.
// Products from a seller that already has K items in the visible page get a small penalty.
const SELLER_DIVERSITY_PENALTY_PER_EXTRA = 0.15;
const SELLER_DIVERSITY_THRESHOLD = 3; // max products from one seller before penalty kicks in

const SELLER_SELECT = {
  id: true,
  businessName: true,
  location: true,
  ratingAverage: true,
  ratingCount: true,
  salesCount: true,
} as const;

const PRODUCT_INCLUDES = {
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  variants: { orderBy: { size: 'asc' as const } },
  seller: { select: SELLER_SELECT },
  rootCategory: { select: { id: true, name: true, slug: true } },
  subStyle: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Main entry: score and rank products for a user
  //
  // sessionId — narrow to a single session's swipes (used for session results)
  // userId    — score across ALL historical swipes (used for the personalized feed)
  // excludeIds — products already seen, never shown again
  // ---------------------------------------------------------------------------

  async recommend(options: {
    userId: string;
    department: Department;
    sessionId?: string;
    excludeIds?: string[];
    limit?: number;
    rootCategoryId?: string;
  }) {
    const { userId, department, sessionId, excludeIds = [], limit = 20, rootCategoryId } = options;

    // Build taste profile from relevant swipe history.
    const profile = await this.buildTasteProfile(userId, sessionId);

    // Candidate pool: LIVE products in this department not yet seen.
    const candidates = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.LIVE,
        department,
        id: excludeIds.length ? { notIn: excludeIds } : undefined,
        ...(rootCategoryId && { rootCategoryId }),
      },
      include: PRODUCT_INCLUDES,
    });

    if (candidates.length === 0) return { items: [], profile: this.serializeProfile(profile) };

    // No signal at all: fall back to enforced variety (constraint #4).
    if (profile.swipeCount === 0 || profile.totalWeight === 0) {
      return {
        items: this.enforceVariety(candidates, limit),
        profile: this.serializeProfile(profile),
        usedFallback: true,
      };
    }

    // Score every candidate.
    const scored = candidates.map((product) => ({
      product,
      score: this.scoreProduct(product, profile),
    }));

    // Sort by score descending.
    scored.sort((a, b) => b.score - a.score);

    // Apply seller diversity pass: penalise products from over-represented sellers.
    const diversified = this.applySellerDiversity(scored, limit);

    return {
      items: diversified.map((s) => s.product),
      profile: this.serializeProfile(profile),
      usedFallback: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Build taste profile from swipe history
  // ---------------------------------------------------------------------------

  private async buildTasteProfile(userId: string, sessionId?: string): Promise<TasteProfile> {
    const profile: TasteProfile = {
      pattern: new Map(),
      tone: new Map(),
      brightness: new Map(),
      saturation: new Map(),
      formality: new Map(),
      coverage: new Map(),
      cut: new Map(),
      silhouette: new Map(),
      totalWeight: 0,
      swipeCount: 0,
    };

    const swipes = await this.prisma.swipeEvent.findMany({
      where: {
        userId,
        ...(sessionId ? { sessionId } : {}),
        // Only positive swipes feed the taste profile.
        // LEFT swipes are used for exclusion, not preference building.
        direction: { in: [SwipeDirection.RIGHT, SwipeDirection.UP] },
      },
      include: {
        product: {
          select: {
            pattern: true,
            tone: true,
            brightness: true,
            saturation: true,
            formality: true,
            coverage: true,
            cut: true,
            silhouette: true,
          },
        },
      },
    });

    for (const swipe of swipes) {
      const w = Number(swipe.weight); // already computed and stored at swipe time
      const p = swipe.product;

      for (const attr of SCORED_ATTRS) {
        const val = p[attr] as string;
        profile[attr].set(val, (profile[attr].get(val) ?? 0) + w);
      }

      // Silhouette (free string) — exact match scoring.
      const sil = p.silhouette.toLowerCase();
      profile.silhouette.set(sil, (profile.silhouette.get(sil) ?? 0) + w);

      profile.totalWeight += w;
      profile.swipeCount += 1;
    }

    return profile;
  }

  // ---------------------------------------------------------------------------
  // Score one product against a taste profile
  //
  // Score = sum of preference weights for each matching attribute value,
  //         normalised by totalWeight so scores are comparable across sessions
  //         of different lengths.
  //
  // Layer 1 weights (all equal for v1 — Milestone 7 can tune per-attribute):
  //   pattern, tone, brightness, saturation, formality, coverage, cut: weight 1.0
  //   silhouette exact match: bonus 0.5 (secondary signal)
  //
  // Negative signal: products whose attributes were consistently LEFT-swiped
  //   get an implicit zero for those attributes (not looked up in profile).
  // ---------------------------------------------------------------------------

  private scoreProduct(
    product: { pattern: string; tone: string; brightness: string; saturation: string; formality: string; coverage: string; cut: string; silhouette: string },
    profile: TasteProfile,
  ): number {
    if (profile.totalWeight === 0) return 0;

    let raw = 0;

    for (const attr of SCORED_ATTRS) {
      const val = (product as Record<string, string>)[attr];
      raw += profile[attr].get(val) ?? 0;
    }

    // Silhouette bonus.
    const sil = product.silhouette.toLowerCase();
    const silScore = profile.silhouette.get(sil) ?? 0;
    raw += silScore * 0.5;

    // Normalise: divide by totalWeight × (number of attributes + 0.5 for silhouette).
    const maxPossible = profile.totalWeight * (SCORED_ATTRS.length + 0.5);
    return raw / maxPossible;
  }

  // ---------------------------------------------------------------------------
  // Seller diversity: penalise products from over-represented sellers
  //
  // After initial sort, walk through results. Count appearances per seller.
  // Once a seller hits SELLER_DIVERSITY_THRESHOLD, deduct a small score penalty
  // per additional item and re-sort the remaining items.
  // ---------------------------------------------------------------------------

  private applySellerDiversity(
    scored: Array<{ product: { seller: { id: string } }; score: number }>,
    limit: number,
  ) {
    const sellerCount = new Map<string, number>();
    const result: typeof scored = [];
    const deferred: typeof scored = [];

    for (const item of scored) {
      const sellerId = item.product.seller.id;
      const count = sellerCount.get(sellerId) ?? 0;

      if (count < SELLER_DIVERSITY_THRESHOLD) {
        result.push(item);
        sellerCount.set(sellerId, count + 1);
      } else {
        // Penalise and defer — will be inserted later.
        deferred.push({
          ...item,
          score: item.score - SELLER_DIVERSITY_PENALTY_PER_EXTRA * (count - SELLER_DIVERSITY_THRESHOLD + 1),
        });
        sellerCount.set(sellerId, count + 1);
      }

      if (result.length >= limit) break;
    }

    // If page not full yet, fill from deferred (still ranked by penalised score).
    if (result.length < limit && deferred.length > 0) {
      deferred.sort((a, b) => b.score - a.score);
      result.push(...deferred.slice(0, limit - result.length));
    }

    return result.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Variety fallback (constraint #4): interleave across sellers and categories
  // ---------------------------------------------------------------------------

  private enforceVariety(
    candidates: Array<{ seller: { id: string }; rootCategoryId: string }>,
    limit: number,
  ) {
    // Build buckets per (seller × category) combination.
    const buckets = new Map<string, typeof candidates>();
    for (const p of candidates) {
      const key = `${p.seller.id}::${p.rootCategoryId}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(p);
    }

    const lists = [...buckets.values()];
    const result: typeof candidates = [];
    const maxLen = Math.max(...lists.map((l) => l.length));

    outer: for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        if (list[i]) {
          result.push(list[i]);
          if (result.length >= limit) break outer;
        }
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Serialise profile for debugging / frontend transparency
  // ---------------------------------------------------------------------------

  private serializeProfile(profile: TasteProfile) {
    const out: Record<string, Record<string, number>> = {};
    for (const attr of [...SCORED_ATTRS, 'silhouette' as const]) {
      const map = profile[attr];
      if (map.size > 0) {
        out[attr] = Object.fromEntries(
          [...map.entries()].sort((a, b) => b[1] - a[1]),
        );
      }
    }
    return { attributes: out, totalWeight: profile.totalWeight, swipeCount: profile.swipeCount };
  }

  // ---------------------------------------------------------------------------
  // Personalised feed (all-time history, not session-scoped)
  // ---------------------------------------------------------------------------

  async personalizedFeed(userId: string, department: Department, limit = 20) {
    // Exclude products the user has already swiped in any session.
    const seen = await this.prisma.swipeEvent.findMany({
      where: { userId },
      select: { productId: true },
      distinct: ['productId'],
    });
    const seenIds = seen.map((s) => s.productId);

    return this.recommend({ userId, department, excludeIds: seenIds, limit });
  }
}
