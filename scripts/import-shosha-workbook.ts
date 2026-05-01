import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { averageBreakdown, BASE_SCORE } from '../src/lib/scoring';

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };

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

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

async function main() {
  const workbookPath = process.argv[2] ?? path.join(process.env.USERPROFILE ?? '.', 'Downloads', 'SHOSHA ALGO.xlsx');
  const buffer = fs.readFileSync(workbookPath);
  const entries = readZipEntries(buffer);
  const strings = sharedStrings(readZipFile(buffer, entries, 'xl/sharedStrings.xml'));
  const rows = sheetRows(readZipFile(buffer, entries, 'xl/worksheets/sheet3.xml'), strings);
  const [header, ...profiles] = rows;
  if (!header?.[0]?.includes('PROFILE ID')) throw new Error('PROFILES sheet was not found at sheet3.xml.');

  const accountsRepo = await import('../src/lib/repos/accounts');
  let created = 0;
  let updated = 0;
  for (const row of profiles) {
    const profileId = row[0]?.trim();
    const name = row[1]?.trim();
    const username = row[2]?.trim();
    if (!profileId || !name || !username) continue;
    const existing = await accountsRepo.findById(profileId);
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
    const dob = excelDate(row[6] ?? '');
    const payload = {
      platform: 'website' as const,
      username,
      displayName: name,
      bio: row[26] ?? '',
      avatarUrl: '',
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
      opposedPosts: Number(row[30] || 0),
      aiFlaggedPosts: Number(row[31] || 0),
      disputedPosts: Number(row[32] || 0),
      disputesLost: Number(row[33] || 0),
      ...(dob ? { dob } : {}),
    };
    if (existing) {
      await accountsRepo.update(profileId, payload);
      updated += 1;
    } else {
      await accountsRepo.createWithId(profileId, payload);
      created += 1;
    }
  }
  console.log(`Workbook import complete. Created: ${created}. Updated: ${updated}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
