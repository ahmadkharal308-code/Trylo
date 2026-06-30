/**
 * Production-safe seeding guard.
 *
 * Runs at deploy/startup. Seeds the pilot dataset ONLY when the database has no
 * products yet (i.e. a fresh deployment). If products already exist, it does
 * nothing — so it NEVER wipes real data on a redeploy or restart.
 *
 * This intentionally swallows all errors and always exits 0: seeding must never
 * be able to block the API from starting. If seeding fails, the API still boots
 * (just with an empty catalogue) and the error is logged for inspection.
 *
 * Skip entirely by setting SEED_ON_EMPTY=false.
 */
import { PrismaClient } from '@prisma/client';
import { seed } from './seed';

async function run(): Promise<void> {
  if (process.env.SEED_ON_EMPTY === 'false') {
    console.log('[seed-if-empty] SEED_ON_EMPTY=false — skipping.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.product.count();
    if (existing > 0) {
      console.log(`[seed-if-empty] Database already has ${existing} products — skipping seed.`);
      return;
    }
    console.log('[seed-if-empty] Empty database detected — running pilot seed...');
    await seed();
    console.log('[seed-if-empty] Seed complete.');
  } catch (err) {
    console.error('[seed-if-empty] Seeding failed (continuing startup anyway):', err);
  } finally {
    await prisma.$disconnect();
  }
}

run()
  .catch((err) => {
    console.error('[seed-if-empty] Unexpected error (continuing startup anyway):', err);
  })
  .finally(() => process.exit(0));
