// scripts/generate-slugs.ts
// Run once with: npx tsx scripts/generate-slugs.ts
//
// What it does:
// 1. Processes your 50 priority celebrities first
// 2. Then bulk-generates slugs for all remaining accounts
// 3. Writes the slug field to each account in the DB
// 4. Logs every result so you can spot conflicts before anything breaks

import * as accountsRepo from '../src/lib/repos/accounts';

// ─── PRIORITY 50 ──────────────────────────────────────────────
// Exact displayNames as they appear in your DB.
// Script matches these case-insensitively against displayNameLower.
const PRIORITY_NAMES = [
  'Elon Musk',
  'Andrew Tate',
  'Kanye West',
  'Narendra Modi',
  'Logan Paul',
  'MrBeast',
  'Donald Trump',
  'Taylor Swift',
  'Kim Kardashian',
  'Bill Gates',
  'IShowSpeed',
  'Mark Zuckerberg',
  'Lionel Messi',
  'Shah Rukh Khan',
  'Justin Bieber',
  'Drake',
  'Sam Altman',
  'Mukesh Ambani',
  'Travis Scott',
  'Vladimir Putin',
  'Xi Jinping',
  'Piers Morgan',
  'Addison Rae',
  'Olivia Rodrigo',
  'Sabrina Carpenter',
  'Ice Spice',
  'The Weeknd',
  'JD Vance',
  'Zohran Mamdani',
  'Megan Fox',
  'Giorgia Meloni',
  'Apoorva Mukhija',
  'Kusha Kapila',
  'Yogi Adityanath',
  'Diljit Dosanjh',
  'Lando Norris',
  'Zayn Malik',
  'Billie Eilish',
  'Timothée Chalamet',
  'Jungkook',
  'D4vd',
  'Lewis Hamilton',
  'Max Verstappen',
  'Kendrick Lamar',
  'Pope Leo XIV',
  'Ranbir Kapoor',
  'Sydney Sweeney',
  'Zendaya',
  'PinkPantheress',
  'Kim Jong Un',
  'Samay Raina',
];

// ─── SLUG GENERATOR ───────────────────────────────────────────
// "Narendra Modi" → "narendra-modi"
// "MrBeast" → "mrbeast"
// "D4vd" → "d4vd"
// "Timothée Chalamet" → "timothee-chalamet" (strips accents)
function generateSlug(displayName: string): string {
  return displayName
    .normalize('NFD')                        // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')         // strip accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')           // remove special chars
    .replace(/\s+/g, '-')                    // spaces to hyphens
    .replace(/-+/g, '-')                     // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');               // trim leading/trailing hyphens
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('\n📋 Fetching all accounts from DB...');
  const all = await accountsRepo.listAll(1000);
  console.log(`   Found ${all.length} accounts total.\n`);

  // Build a map of displayNameLower → account for fast lookup
  const byDisplayName = new Map(
    all.map((a) => [a.displayName?.toLowerCase().trim(), a])
  );

  // Track slugs already assigned to catch conflicts
  const usedSlugs = new Map<string, string>(); // slug → account._id
  const results: Array<{
    id: string;
    displayName: string;
    slug: string;
    status: 'written' | 'conflict' | 'skipped' | 'not_found';
  }> = [];

  // ── Step 1: Priority 50 first ──
  console.log('⭐ Processing priority 50 celebrities...\n');

  for (const name of PRIORITY_NAMES) {
    const account = byDisplayName.get(name.toLowerCase().trim());

    if (!account) {
      console.warn(`   ⚠️  NOT FOUND in DB: "${name}" — check displayName spelling`);
      results.push({ id: '—', displayName: name, slug: '—', status: 'not_found' });
      continue;
    }

    // Skip if already has a slug
    if ((account as any).slug) {
      console.log(`   ⏭️  SKIP (already has slug): ${account.displayName} → ${(account as any).slug}`);
      results.push({ id: account._id, displayName: account.displayName, slug: (account as any).slug, status: 'skipped' });
      usedSlugs.set((account as any).slug, account._id);
      continue;
    }

    const slug = generateSlug(name);

    // Conflict check
    if (usedSlugs.has(slug)) {
      const conflictId = usedSlugs.get(slug);
      console.error(`   ❌ CONFLICT: "${name}" → "${slug}" already used by ${conflictId}`);
      results.push({ id: account._id, displayName: account.displayName, slug, status: 'conflict' });
      continue;
    }

    // Write to DB
    await accountsRepo.update(account._id, { slug } as any);
    usedSlugs.set(slug, account._id);
    console.log(`   ✅ ${account.displayName} (${account._id}) → /${slug}`);
    results.push({ id: account._id, displayName: account.displayName, slug, status: 'written' });
  }

  // ── Step 2: Remaining accounts ──
  console.log('\n🔄 Processing remaining accounts...\n');
  const priorityIds = new Set(results.map((r) => r.id));

  for (const account of all) {
    if (priorityIds.has(account._id)) continue;         // already done
    if ((account as any).slug) {
      usedSlugs.set((account as any).slug, account._id); // register existing
      continue;
    }
    if (!account.displayName) continue;

    let slug = generateSlug(account.displayName);
    if (!slug) continue;

    // If slug is taken, append the short ID suffix to disambiguate
    if (usedSlugs.has(slug)) {
      const suffix = account._id.replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase();
      slug = `${slug}-${suffix}`;
    }

    await accountsRepo.update(account._id, { slug } as any);
    usedSlugs.set(slug, account._id);
    console.log(`   ✅ ${account.displayName} → /${slug}`);
    results.push({ id: account._id, displayName: account.displayName, slug, status: 'written' });
  }

  // ── Summary ──
  const written   = results.filter((r) => r.status === 'written').length;
  const skipped   = results.filter((r) => r.status === 'skipped').length;
  const conflicts = results.filter((r) => r.status === 'conflict').length;
  const notFound  = results.filter((r) => r.status === 'not_found').length;

  console.log('\n─────────────────────────────────────');
  console.log(`✅ Written:    ${written}`);
  console.log(`⏭️  Skipped:    ${skipped} (already had slugs)`);
  console.log(`❌ Conflicts:  ${conflicts}`);
  console.log(`⚠️  Not found:  ${notFound}`);
  console.log('─────────────────────────────────────');

  if (notFound > 0) {
    console.log('\n⚠️  Not found in DB — check displayName spelling:');
    results.filter((r) => r.status === 'not_found').forEach((r) => console.log(`   • "${r.displayName}"`));
  }

  if (conflicts > 0) {
    console.log('\n❌ Conflicts to resolve manually:');
    results.filter((r) => r.status === 'conflict').forEach((r) => console.log(`   • "${r.displayName}" → "${r.slug}"`));
  }

  console.log('\nDone. Slugs are live in the DB.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});