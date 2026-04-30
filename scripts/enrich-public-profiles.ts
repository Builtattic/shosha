import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

function argValue(name: string) {
  const exact = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return exact?.split('=', 2)[1];
}

async function main() {
  const limit = Math.max(1, Number(argValue('limit') ?? 10));
  const id = argValue('id');
  const force = process.argv.includes('--force');
  const [accountsRepo, enrichment] = await Promise.all([
    import('../src/lib/repos/accounts'),
    import('../src/lib/profileEnrichment'),
  ]);

  const accounts = id
    ? [(await accountsRepo.findById(id))].filter((account): account is NonNullable<typeof account> => Boolean(account))
    : (await accountsRepo.listAll(500)).filter((account) => account.profileKind === 'public_figure');

  const targets = accounts
    .filter((account) => force || enrichment.needsProfileEnrichment(account))
    .slice(0, limit);

  console.log(`Enriching ${targets.length} public profile(s) with ${process.env.GEMINI_DISCOVERY_MODEL || 'gemini-3-pro-preview'}...`);

  let updated = 0;
  let failed = 0;
  for (const account of targets) {
    try {
      await accountsRepo.update(account._id, { enrichmentStatus: 'pending' });
      const patch = await enrichment.enrichPublicProfileDetails(account);
      await accountsRepo.update(account._id, patch);
      updated += 1;
      console.log(`Updated ${account._id} ${account.displayName}`);
    } catch (error) {
      failed += 1;
      await accountsRepo.update(account._id, {
        enrichmentStatus: 'stale',
        evidenceSummary: error instanceof Error ? error.message.slice(0, 500) : 'Gemini enrichment failed.',
      });
      console.error(`Failed ${account._id} ${account.displayName}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Profile enrichment complete. Updated: ${updated}. Failed: ${failed}.`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
