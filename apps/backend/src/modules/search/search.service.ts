import { Injectable } from '@nestjs/common';
import { Department, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDto } from './dto/search.dto';

// Minimum similarity threshold for pg_trgm fuzzy matching (0–1 scale).
// 0.15 is loose enough to catch single-character typos like "abbaya" → "abaya"
// but tight enough to exclude totally unrelated words.
const SIMILARITY_THRESHOLD = 0.15;

// Minimum word length before we apply fuzzy matching.
// Short words (1–2 chars) produce too many false positives with trigrams.
const MIN_FUZZY_LENGTH = 3;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchDto) {
    const raw = dto.q.trim();
    const department = dto.department;
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;

    // Step 1: try to resolve the query to a taxonomy category first.
    // A search for "abaya" should lock to the abaya category, not scatter
    // across all products that happen to mention the word. (Spec: category-faithful.)
    const taxonomy = await this.resolveTaxonomy(raw, department);

    // Step 2: search products, filtering by resolved category if found.
    const { products, correctedQuery } = await this.searchProducts(
      raw,
      department,
      taxonomy,
      limit,
      offset,
    );

    return {
      query: raw,
      // Let the client know when we corrected a typo — show a "Did you mean X?" notice.
      correctedQuery: correctedQuery !== raw ? correctedQuery : null,
      taxonomy: taxonomy ?? null,
      total: products.length < limit && offset === 0 ? products.length : undefined,
      items: products,
    };
  }

  // ---------------------------------------------------------------------------
  // Step 1: resolve raw input to a RootCategory + optional SubStyle
  //
  // Resolution strategy: score both root categories and sub-styles, then pick
  // the best overall match. A root category with similarity 1.0 wins over a
  // sub-style with 0.54 even though the sub-style name contains the query word.
  // This prevents "abaya" from resolving to "Nida Abaya" (sub-style) instead
  // of "Abaya" (root category), which would exclude products in other sub-styles.
  // ---------------------------------------------------------------------------

  private async resolveTaxonomy(query: string, department?: Department) {
    const q = query.toLowerCase();

    const [rootCats, subStyles] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string; department: Department; similarity: number }>
      >(Prisma.sql`
        SELECT id, name, slug, department,
          similarity(lower(name), ${q}) AS similarity
        FROM root_categories
        WHERE "isActive" = true
          ${department ? Prisma.sql`AND department = ${department}::"Department"` : Prisma.sql``}
          AND (
            lower(name) ILIKE ${'%' + q + '%'}
            OR similarity(lower(name), ${q}) > ${SIMILARITY_THRESHOLD}
          )
        ORDER BY similarity DESC, length(name) ASC
        LIMIT 3
      `),
      this.prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string; rootCategoryId: string; similarity: number }>
      >(Prisma.sql`
        SELECT ss.id, ss.name, ss.slug, ss."rootCategoryId",
          similarity(lower(ss.name), ${q}) AS similarity
        FROM sub_styles ss
        JOIN root_categories rc ON rc.id = ss."rootCategoryId"
        WHERE ss."isActive" = true AND rc."isActive" = true
          ${department ? Prisma.sql`AND rc.department = ${department}::"Department"` : Prisma.sql``}
          AND (
            lower(ss.name) ILIKE ${'%' + q + '%'}
            OR similarity(lower(ss.name), ${q}) > ${SIMILARITY_THRESHOLD}
          )
        ORDER BY similarity DESC, length(ss.name) ASC
        LIMIT 3
      `),
    ]);

    const bestRoot = rootCats[0];
    const bestSub = subStyles[0];

    // If neither matched, no taxonomy resolution.
    if (!bestRoot && !bestSub) return null;

    // Prefer root category when:
    //   a) only root matched, or
    //   b) root similarity is >= sub similarity (prevents "abaya" → "Nida Abaya")
    if (bestRoot && (!bestSub || bestRoot.similarity >= bestSub.similarity)) {
      return { rootCategory: bestRoot, subStyle: null, matchedOn: 'root_category' as const };
    }

    // Otherwise use the sub-style (query is specific enough, e.g. "nida abaya").
    const rootCategory = await this.prisma.rootCategory.findUnique({
      where: { id: bestSub.rootCategoryId },
      select: { id: true, name: true, slug: true, department: true },
    });
    return { rootCategory, subStyle: bestSub, matchedOn: 'sub_style' as const };
  }

  // ---------------------------------------------------------------------------
  // Step 2: search products
  // ---------------------------------------------------------------------------

  private async searchProducts(
    query: string,
    department: Department | undefined,
    taxonomy: Awaited<ReturnType<typeof this.resolveTaxonomy>>,
    limit: number,
    offset: number,
  ) {
    const q = query.toLowerCase();
    const useFuzzy = q.length >= MIN_FUZZY_LENGTH;

    // If we resolved to a category, prioritise products in that category.
    // This is the "category-faithful" guarantee from spec + CLAUDE.md constraint #3.
    const rootCategoryId = taxonomy?.rootCategory?.id;
    const subStyleId = taxonomy?.subStyle?.id;

    type ProductRow = {
      id: string;
      title: string;
      description: string | null;
      priceMinor: number;
      department: Department;
      sellerId: string;
      rootCategoryId: string;
      subStyleId: string | null;
      status: string;
      pattern: string;
      tone: string;
      brightness: string;
      saturation: string;
      formality: string;
      coverage: string;
      cut: string;
      silhouette: string;
      attributesExtra: unknown;
      createdAt: Date;
      updatedAt: Date;
      rank: number;
      matched_title: string | null;
    };

    const rows = await this.prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT
        p.*,
        -- Rank: exact title match > fuzzy title > description match
        CASE
          WHEN lower(p.title) ILIKE ${'%' + q + '%'} THEN 3
          WHEN ${useFuzzy} AND similarity(lower(p.title), ${q}) > ${SIMILARITY_THRESHOLD} THEN 2
          WHEN lower(p.description) ILIKE ${'%' + q + '%'} THEN 1
          ELSE 0
        END AS rank,
        -- Surface the best matching title variant for "did you mean" detection
        CASE
          WHEN lower(p.title) ILIKE ${'%' + q + '%'} THEN p.title
          WHEN ${useFuzzy} AND similarity(lower(p.title), ${q}) > ${SIMILARITY_THRESHOLD} THEN p.title
          ELSE NULL
        END AS matched_title
      FROM products p
      WHERE
        p.status = 'LIVE'
        ${department ? Prisma.sql`AND p.department = ${department}::"Department"` : Prisma.sql``}
        ${rootCategoryId ? Prisma.sql`AND p."rootCategoryId" = ${rootCategoryId}` : Prisma.sql``}
        ${subStyleId ? Prisma.sql`AND p."subStyleId" = ${subStyleId}` : Prisma.sql``}
        AND (
          lower(p.title) ILIKE ${'%' + q + '%'}
          OR lower(p.description) ILIKE ${'%' + q + '%'}
          ${useFuzzy ? Prisma.sql`OR similarity(lower(p.title), ${q}) > ${SIMILARITY_THRESHOLD}` : Prisma.sql``}
          ${rootCategoryId ? Prisma.sql`OR TRUE` : Prisma.sql``}
        )
      ORDER BY rank DESC, p."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Fetch images + variants + seller info for result rows in one go.
    const productIds = rows.map((r) => r.id);
    const [images, variants, sellers] = await Promise.all([
      productIds.length
        ? this.prisma.productImage.findMany({
            where: { productId: { in: productIds } },
            orderBy: { sortOrder: 'asc' },
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof this.prisma.productImage.findMany>>),
      productIds.length
        ? this.prisma.productVariant.findMany({
            where: { productId: { in: productIds } },
            orderBy: { size: 'asc' },
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof this.prisma.productVariant.findMany>>),
      productIds.length
        ? this.prisma.seller.findMany({
            where: { id: { in: rows.map((r) => r.sellerId) } },
            select: {
              id: true,
              businessName: true,
              location: true,
              ratingAverage: true,
              ratingCount: true,
              salesCount: true,
            },
          })
        : Promise.resolve([] as Array<{ id: string; businessName: string; location: string | null; ratingAverage: unknown; ratingCount: number; salesCount: number }>),
    ]);

    const imgMap = new Map<string, typeof images>();
    const varMap = new Map<string, typeof variants>();
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));
    images.forEach((img) => {
      if (!imgMap.has(img.productId)) imgMap.set(img.productId, []);
      imgMap.get(img.productId)!.push(img);
    });
    variants.forEach((v) => {
      if (!varMap.has(v.productId)) varMap.set(v.productId, []);
      varMap.get(v.productId)!.push(v);
    });

    // Detect if the query was a fuzzy correction (matched via trigrams, not exact).
    const fuzzyMatch = rows.find((r) => r.rank === 2 && r.matched_title);
    const correctedQuery =
      fuzzyMatch?.matched_title
        ? this.extractCorrectedTerm(q, fuzzyMatch.matched_title)
        : query;

    const products = rows.map(({ rank: _r, matched_title: _m, ...p }) => ({
      ...p,
      images: imgMap.get(p.id) ?? [],
      variants: varMap.get(p.id) ?? [],
      seller: sellerMap.get(p.sellerId) ?? null,
    }));

    return { products, correctedQuery };
  }

  // ---------------------------------------------------------------------------
  // Extract the most likely corrected term from a fuzzy-matched title.
  // e.g. query="abbaya", title="Classic Abaya" → "Abaya"
  // ---------------------------------------------------------------------------

  private extractCorrectedTerm(query: string, matchedTitle: string): string {
    const words = matchedTitle.split(/\s+/);
    // Find the word in the title that is most similar to the query.
    let best = matchedTitle;
    let bestScore = 0;
    for (const word of words) {
      const score = this.trigramSimilarity(query, word.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        best = word;
      }
    }
    return bestScore > SIMILARITY_THRESHOLD ? best : matchedTitle;
  }

  // Simple JS-side trigram similarity approximation (only used for the "did you mean" label).
  private trigramSimilarity(a: string, b: string): number {
    const trigramsOf = (s: string) => {
      const padded = `  ${s} `;
      const set = new Set<string>();
      for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
      return set;
    };
    const ta = trigramsOf(a);
    const tb = trigramsOf(b);
    let intersection = 0;
    ta.forEach((t) => { if (tb.has(t)) intersection++; });
    return (2 * intersection) / (ta.size + tb.size);
  }

  // ---------------------------------------------------------------------------
  // Taxonomy browse — list all categories and sub-styles (for the search UI)
  // ---------------------------------------------------------------------------

  async getTaxonomy(department?: Department) {
    return this.prisma.rootCategory.findMany({
      where: {
        isActive: true,
        ...(department && { department }),
      },
      include: {
        subStyles: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
