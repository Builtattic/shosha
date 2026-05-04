import fs from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import zlib from 'node:zlib';
import { averageBreakdown, BASE_SCORE } from '../src/lib/scoring';
import type { AccountRecord } from '../src/lib/repos/accounts';

loadEnvConfig(process.cwd());

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };
type ImportOptions = { dryRun: boolean; updateExisting: boolean };

function readZipEntries(buffer: Buffer): ZipEntry[] {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid XLSX: end of central directory not found.');
  const total = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < total; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid XLSX central directory.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readZipFile(buffer: Buffer, entries: ZipEntry[], name: string): string {
  const entry = entries.find((item) => item.name === name);
  if (!entry) throw new Error(`Missing XLSX entry: ${name}`);
  const offset = entry.localOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error(`Invalid local header for ${name}`);
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return compressed.toString('utf8');
  if (entry.method === 8) return zlib.inflateRawSync(compressed).toString('utf8');
  throw new Error(`Unsupported ZIP compression method ${entry.method} for ${name}`);
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(''))
  );
}

function colNumber(ref: string): number {
  const letters = ref.match(/[A-Z]+/)?.[0] ?? '';
  return [...letters].reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
}

function cellValue(cellXml: string, strings: string[]): string {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1];
  const raw = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
  if (type === 's') return strings[Number(raw)] ?? '';
  if (type === 'inlineStr') return decodeXml(cellXml.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '');
  return decodeXml(raw);
}

function sheetRows(xml: string, strings: string[]): string[][] {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = cellMatch[1].match(/\br="([^"]+)"/)?.[1] ?? '';
      row[colNumber(ref) - 1] = cellValue(cellMatch[0], strings);
    }
    return row;
  });
}

function excelDate(serial: string): string | undefined {
  const value = Number(serial);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + value * 24 * 60 * 60 * 1000).toISOString();
}

function parseDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return excelDate(trimmed);
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!mdy) return undefined;
  const [, month, day, year] = mdy;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
}

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

function csvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    const next = csv[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function profileRows(filePath: string): string[][] {
  if (filePath.toLowerCase().endsWith('.csv')) return csvRows(fs.readFileSync(filePath, 'utf8'));
  const buffer = fs.readFileSync(filePath);
  const entries = readZipEntries(buffer);
  const strings = sharedStrings(readZipFile(buffer, entries, 'xl/sharedStrings.xml'));
  return sheetRows(readZipFile(buffer, entries, 'xl/worksheets/sheet3.xml'), strings);
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function indexAccounts(accounts: AccountRecord[]) {
  const byId = new Map<string, AccountRecord>();
  const byDisplayName = new Map<string, AccountRecord>();
  const byWebsiteUsername = new Map<string, AccountRecord>();
  const bySocialUrl = new Map<string, AccountRecord>();
  for (const account of accounts) {
    byId.set(account._id, account);
    if (account.displayNameLower) byDisplayName.set(account.displayNameLower, account);
    if (account.displayName) byDisplayName.set(account.displayName.trim().toLowerCase(), account);
    if (account.platform === 'website' && account.usernameLower) byWebsiteUsername.set(account.usernameLower, account);
    if (account.platform === 'website' && account.username) byWebsiteUsername.set(account.username.trim().toLowerCase(), account);
    for (const link of Object.values(account.socialLinks ?? {})) {
      if (link?.url) bySocialUrl.set(normalizeSocialUrl(link.url), account);
    }
  }
  return { byId, byDisplayName, byWebsiteUsername, bySocialUrl };
}

function normalizeSocialUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function optionsFromArgs(args: string[]): { inputPath: string; options: ImportOptions } {
  const options = {
    dryRun: args.includes('--dry-run'),
    updateExisting: args.includes('--update-existing'),
  };
  const inputPath = args.find((arg) => !arg.startsWith('--')) ?? path.join(process.env.USERPROFILE ?? '.', 'Downloads', 'SHOSHA ALGO.xlsx');
  return { inputPath, options };
}

async function main() {
  const { inputPath, options } = optionsFromArgs(process.argv.slice(2));
  const rows = profileRows(inputPath);
  const [header, ...profiles] = rows;
  if (!header?.[0]?.includes('PROFILE ID')) throw new Error('PROFILES sheet was not found.');

  const accountsRepo = await import('../src/lib/repos/accounts');
  const accountIndex = indexAccounts(await accountsRepo.listAll(5000));
  let created = 0;
  let updated = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;
  let skippedCsvDuplicate = 0;
  const seenProfileIds = new Set<string>();
  for (const row of profiles) {
    const profileId = row[0]?.trim();
    const name = row[1]?.trim();
    const username = slugify(row[2]?.trim() || name || profileId || '');
    if (!profileId || !name || !username) {
      skippedInvalid += 1;
      continue;
    }
    if (seenProfileIds.has(profileId)) {
      skippedCsvDuplicate += 1;
      continue;
    }
    seenProfileIds.add(profileId);
    const existing = accountIndex.byId.get(profileId) ?? null;
    const duplicateByName = existing ? null : accountIndex.byDisplayName.get(name.toLowerCase()) ?? null;
    const duplicateByUsername = existing || duplicateByName
      ? null
      : accountIndex.byWebsiteUsername.get(username.toLowerCase()) ?? null;
    const duplicateBySocialUrl = existing || duplicateByName || duplicateByUsername
      ? null
      : [row[17], row[18], row[19], row[20], row[21], row[22], row[23], row[24]]
          .filter(Boolean)
          .map((url) => accountIndex.bySocialUrl.get(normalizeSocialUrl(url)))
          .find(Boolean) ?? null;

    if (!options.updateExisting && (existing || duplicateByName || duplicateByUsername || duplicateBySocialUrl)) {
      skippedExisting += 1;
      continue;
    }

    const socialLinks = cleanUndefined({
      ...(existing?.socialLinks ?? {}),
      instagram: row[17] ? { url: row[17], username } : existing?.socialLinks?.instagram,
      tiktok: row[18] ? { url: row[18], username } : existing?.socialLinks?.tiktok,
      x: row[19] ? { url: row[19], username } : existing?.socialLinks?.x,
      linkedin: row[20] ? { url: row[20], username } : existing?.socialLinks?.linkedin,
      reddit: row[21] ? { url: row[21], username } : existing?.socialLinks?.reddit,
      youtube: row[22] ? { url: row[22], username } : existing?.socialLinks?.youtube,
      facebook: row[23] ? { url: row[23], username } : existing?.socialLinks?.facebook,
      snapchat: row[24] ? { url: row[24], username } : existing?.socialLinks?.snapchat,
    });
    const dob = parseDate(row[6] ?? '');
    const avatarUrl = row[25]?.trim().startsWith('http')
      ? row[25].trim()
      : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const payload = {
      platform: 'website' as const,
      username,
      displayName: name,
      bio: row[26] ?? '',
      avatarUrl,
      verified: false,
      followers: row[11] ?? '',
      score: existing?.score ?? BASE_SCORE,
      scoreHistory: existing?.scoreHistory ?? [{ t: new Date().toISOString(), s: BASE_SCORE, cause: 'seed' as const }],
      breakdown: existing?.breakdown ?? averageBreakdown(),
      posts: existing?.posts ?? [],
      claimed: Boolean(existing?.claimed),
      claimedBy: existing?.claimedBy ?? null,
      profileId,
      profileKind: 'public_figure' as const,
      profileUserType: row[3] ?? '',
      email: row[4] ?? '',
      phone: row[5] ?? '',
      age: Number(row[7] || 0),
      cityCountry: row[8] ?? '',
      region: row[9] ?? '',
      role: row[10] ?? '',
      reach: row[11] ?? '',
      educationWorkbook: row[12] ?? '',
      specializedFieldWorkbook: row[13] ?? '',
      managementWorkbook: row[14] ?? '',
      disability: row[15] ?? '',
      lifestyle: row[16] ?? '',
      socialLinks,
      quote: row[27] ?? '',
      profileCompletion: Number(row[28] || 0),
      socialPostCount: Number(row[29] || 0),
      opposedPosts: Number(row[30] || 0),
      aiFlaggedPosts: Number(row[31] || 0),
      disputedPosts: Number(row[32] || 0),
      disputesLost: Number(row[33] || 0),
      ...(dob ? { dob } : {}),
    };
    if (existing) {
      if (!options.dryRun) await accountsRepo.update(profileId, payload);
      accountIndex.byId.set(profileId, { ...existing, ...payload, _id: profileId });
      updated += 1;
    } else {
      if (!options.dryRun) await accountsRepo.createWithId(profileId, payload);
      const createdAccount = {
        ...payload,
        _id: profileId,
        usernameLower: payload.username.toLowerCase(),
        displayNameLower: payload.displayName.toLowerCase(),
      } as AccountRecord;
      accountIndex.byId.set(profileId, createdAccount);
      accountIndex.byDisplayName.set(createdAccount.displayNameLower!, createdAccount);
      accountIndex.byWebsiteUsername.set(createdAccount.usernameLower!, createdAccount);
      for (const link of Object.values(createdAccount.socialLinks ?? {})) {
        if (link?.url) accountIndex.bySocialUrl.set(normalizeSocialUrl(link.url), createdAccount);
      }
      created += 1;
    }
  }
  const mode = options.dryRun ? 'dry run' : 'import';
  console.log(`Profile ${mode} complete. Created: ${created}. Updated: ${updated}. Skipped existing: ${skippedExisting}. Skipped duplicate CSV rows: ${skippedCsvDuplicate}. Skipped invalid: ${skippedInvalid}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
