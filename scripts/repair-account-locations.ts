/**
 * 1) Removes placeholder region "Global" when there is no cityCountry (from prior backfill).
 * 2) Copies cityCountry + region from the matching SS dossier onto website_* accounts
 *    (match by profileId first, then by display name).
 *
 * Dry run: pnpm exec tsx scripts/repair-account-locations.ts
 * Live:    pnpm exec tsx scripts/repair-account-locations.ts --no-dry-run
 */
import { loadEnvConfig } from '@next/env';
import { cert, getApps, initializeApp, deleteApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

loadEnvConfig(process.cwd());

const SS_ID = /^SS\d{5}$/;

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlaceholderGlobalRegion(region: string): boolean {
  return region.trim().toLowerCase() === 'global';
}

type RawAccount = Record<string, unknown> & {
  _id: string;
  platform?: string;
  profileId?: string;
  displayName?: string;
  displayNameLower?: string;
  cityCountry?: string;
  region?: string;
};

function asAccount(id: string, raw: Record<string, unknown>): RawAccount {
  return { _id: id, ...raw } as RawAccount;
}

async function main() {
  const dryRun = !process.argv.includes('--no-dry-run');
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!serviceAccountJson || !databaseURL) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_DATABASE_URL (use project .env)');
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      databaseURL,
    });
  }

  const db = getDatabase();
  const snap = await db.ref('accounts').once('value');
  const raw = (snap.val() ?? {}) as Record<string, Record<string, unknown>>;
  const entries = Object.entries(raw).map(([id, v]) => asAccount(id, v));

  const ssAccounts = entries.filter((a) => SS_ID.test(a._id));

  const ssByProfileId = new Map<string, RawAccount>();
  for (const a of ssAccounts) {
    const pid = trimText(a.profileId) || a._id;
    if (pid) ssByProfileId.set(pid, a);
  }

  const ssByDisplayLower = new Map<string, RawAccount>();
  for (const a of ssAccounts) {
    const key = trimText(a.displayNameLower) || trimText(a.displayName).toLowerCase();
    if (!key) continue;
    const existing = ssByDisplayLower.get(key);
    const hasCity = Boolean(trimText(a.cityCountry));
    const existingHasCity = existing ? Boolean(trimText(existing.cityCountry)) : false;
    if (!existing || (!existingHasCity && hasCity)) {
      ssByDisplayLower.set(key, a);
    }
  }

  let clearedGlobal = 0;
  let patchedWebsite = 0;

  for (const acc of entries) {
    const region = trimText(acc.region);
    if (!region || !isPlaceholderGlobalRegion(region)) continue;

    const ref = db.ref(`accounts/${acc._id}`);
    if (dryRun) {
      if (clearedGlobal < 15) console.log(`[DRY RUN] clear Global region: ${acc._id}`);
    } else {
      await ref.update({ region: null, updatedAt: new Date().toISOString() });
    }
    clearedGlobal++;
  }

  for (const acc of entries) {
    if (SS_ID.test(acc._id)) continue;
    const isWebsite = acc._id.startsWith('website_') || trimText(acc.platform).toLowerCase() === 'website';
    if (!isWebsite) continue;

    const city = trimText(acc.cityCountry);
    const region = trimText(acc.region);
    const badRegion = !region || isPlaceholderGlobalRegion(region);
    if (city && !badRegion) continue;

    const pid = trimText(acc.profileId);
    const displayKey =
      trimText(acc.displayNameLower) || trimText(acc.displayName).toLowerCase();

    const donor =
      (pid && ssByProfileId.get(pid)) ||
      (displayKey ? ssByDisplayLower.get(displayKey) : undefined) ||
      undefined;

    if (!donor) continue;

    const dCity = trimText(donor.cityCountry);
    const dRegion = trimText(donor.region);
    if (!dCity && !dRegion) continue;

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (!city && dCity) patch.cityCountry = dCity;
    if (badRegion && dRegion) patch.region = dRegion;
    if (!('cityCountry' in patch) && !('region' in patch)) continue;

    if (dryRun) {
      if (patchedWebsite < 25) {
        console.log(
          `[DRY RUN] website ${acc._id} <- SS donor ${donor._id} cityCountry=${dCity || '—'} region=${dRegion || '—'}`
        );
      }
    } else {
      await db.ref(`accounts/${acc._id}`).update(patch);
      if (patchedWebsite < 25) {
        console.log(`[WRITE] website ${acc._id} <- ${donor._id}`);
      }
    }
    patchedWebsite++;
  }

  console.log('\nRepair complete.');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE WRITE'}`);
  console.log(`  Cleared placeholder Global region: ${clearedGlobal}`);
  console.log(`  Patched website locations from SS: ${patchedWebsite}`);

  await Promise.all(getApps().map((app) => deleteApp(app).catch(() => undefined)));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
