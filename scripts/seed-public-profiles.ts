import { loadEnvConfig } from '@next/env';
import type { AccountRecord } from '../src/lib/repos/accounts';

loadEnvConfig(process.cwd());

process.env.FIREBASE_PROJECT_ID ||= 'shosha-local';
process.env.FIREBASE_DATABASE_URL ||= 'https://shosha-local-default-rtdb.firebaseio.com';
process.env.FIREBASE_STORAGE_BUCKET ||= 'shosha-local.appspot.com';

const PUBLIC_PROFILES = [
  ['SS00001', 'Elon Musk'],
  ['SS00002', 'Andrew Tate'],
  ['SS00003', 'Greta Thunberg'],
  ['SS00004', 'Virat Kohli'],
  ['SS00005', 'Kanye West'],
  ['SS00006', 'Narendra Modi'],
  ['SS00007', 'Logan Paul'],
  ['SS00008', 'Emma Watson'],
  ['SS00009', 'Cristiano Ronaldo'],
  ['SS00010', 'MrBeast'],
  ['SS00011', 'Donald Trump'],
  ['SS00012', 'Taylor Swift'],
  ['SS00013', 'Joe Rogan'],
  ['SS00014', 'Kim Kardashian'],
  ['SS00015', 'Andrew Huberman'],
  ['SS00016', 'Ranveer Allahbadia'],
  ['SS00017', 'Jordan Peterson'],
  ['SS00018', 'Deepika Padukone'],
  ['SS00019', 'Conor McGregor'],
  ['SS00020', 'Bill Gates'],
  ['SS00021', 'Kylie Jenner'],
  ['SS00022', 'Shashi Tharoor'],
  ['SS00023', 'IShowSpeed'],
  ['SS00024', 'Mark Zuckerberg'],
  ['SS00025', 'Priyanka Chopra'],
  ['SS00026', 'Volodymyr Zelenskyy'],
  ['SS00027', 'Ankur Warikoo'],
  ['SS00028', 'Bad Bunny'],
  ['SS00029', 'Lionel Messi'],
  ['SS00030', 'Selena Gomez'],
  ['SS00031', 'Dwayne Johnson'],
  ['SS00032', 'Alia Bhatt'],
  ['SS00033', 'Shah Rukh Khan'],
  ['SS00034', 'Justin Bieber'],
  ['SS00035', 'Ariana Grande'],
  ['SS00036', 'Rishi Sunak'],
  ['SS00037', 'Emmanuel Macron'],
  ['SS00038', 'Kendall Jenner'],
  ['SS00039', 'Hailey Bieber'],
  ['SS00040', 'Drake'],
  ['SS00041', 'Ronaldo Naz\u00e1rio'],
  ['SS00042', 'Neymar Jr'],
  ['SS00043', 'Khabib Nurmagomedov'],
  ['SS00044', 'Israel Adesanya'],
  ['SS00045', 'Elvish Yadav'],
  ['SS00046', 'Carrie Johnson'],
  ['SS00047', 'Sam Altman'],
  ['SS00048', 'Sundar Pichai'],
  ['SS00049', 'Mukesh Ambani'],
  ['SS00050', 'Gautam Adani'],
  ['SS00051', 'Ananya Panday'],
  ['SS00052', 'Travis Scott'],
  ['SS00053', 'Doja Cat'],
  ['SS00054', 'KSI'],
  ['SS00055', 'Ibrahim Ali Khan'],
  ['SS00056', 'Khaby Lame'],
  ['SS00057', 'Vladimir Putin'],
  ['SS00058', 'Xi Jinping'],
  ['SS00059', 'Bashar al-Assad'],
  ['SS00060', 'Benjamin Netanyahu'],
  ['SS00061', 'Imran Khan'],
  ['SS00062', 'Recep Tayyip Erdo\u011fan'],
  ['SS00063', 'Jair Bolsonaro'],
  ['SS00064', 'Hunter Biden'],
  ['SS00065', 'Amber Heard'],
  ['SS00066', 'Johnny Depp'],
  ['SS00067', 'Dan Bilzerian'],
  ['SS00068', 'Tristan Tate'],
  ['SS00069', 'Andrew Cuomo'],
  ['SS00070', 'Sam Bankman-Fried'],
  ['SS00071', 'Elizabeth Holmes'],
  ['SS00072', 'Do Kwon'],
  ['SS00073', 'Alex Jones'],
  ['SS00074', 'Nick Fuentes'],
  ['SS00075', 'Andrew Schulz'],
  ['SS00076', 'Piers Morgan'],
  ['SS00077', 'George Santos'],
  ['SS00078', 'Boris Johnson'],
  ['SS00079', 'Tucker Carlson'],
  ['SS00080', 'Jake Paul'],
  ['SS00081', 'Bella Thorne'],
  ['SS00082', 'Milo Yiannopoulos'],
  ['SS00083', 'Kevin Spacey'],
  ['SS00084', 'Chris Brown'],
  ['SS00085', 'Addison Rae'],
  ['SS00086', "Charli D'Amelio"],
  ['SS00087', "Dixie D'Amelio"],
  ['SS00088', 'Bella Poarch'],
  ['SS00089', 'Noah Beck'],
  ['SS00090', 'Avani Gregg'],
  ['SS00091', 'Bretman Rock'],
  ['SS00092', 'Lil Nas X'],
  ['SS00093', 'Olivia Rodrigo'],
  ['SS00094', 'Sabrina Carpenter'],
  ['SS00095', 'Ice Spice'],
  ['SS00096', 'Central Cee'],
  ['SS00097', 'PinkPantheress'],
  ['SS00098', 'Madison Beer'],
  ['SS00099', 'Alix Earle'],
  ['SS00100', 'Kai Cenat'],
  ['SS00101', 'Adin Ross'],
  ['SS00102', 'Nessa Barrett'],
] as const;

function slugify(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

async function main() {
  const [accountsRepo, scoring] = await Promise.all([
    import('../src/lib/repos/accounts'),
    import('../src/lib/scoring'),
  ]);
  const { averageBreakdown, BASE_SCORE } = scoring;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [profileId, name] of PUBLIC_PROFILES) {
    const existing = await accountsRepo.findById(profileId);
    const username = slugify(name);
    const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

    if (!existing) {
      await accountsRepo.createWithId(profileId, {
        platform: 'website',
        username,
        displayName: name,
        bio: '',
        avatarUrl,
        verified: false,
        followers: 'unknown',
        score: BASE_SCORE,
        scoreHistory: [{ t: new Date().toISOString(), s: BASE_SCORE, cause: 'seed' }],
        breakdown: averageBreakdown(),
        posts: [],
        claimed: false,
        claimedBy: null,
        profileId,
        profileKind: 'public_figure',
        claimable: false,
        credibility: 80,
        enrichmentStatus: 'none',
        socialLinks: {},
        evidenceSummary: ''
      });
      created += 1;
      continue;
    }

    const patch: Partial<AccountRecord> = {};
    if (!existing.profileId) patch.profileId = profileId;
    if (!existing.profileKind) patch.profileKind = 'public_figure';
    if (existing.claimable !== false) patch.claimable = false;
    if (typeof existing.credibility !== 'number') patch.credibility = 80;
    if (!existing.enrichmentStatus) patch.enrichmentStatus = 'none';
    if (!existing.avatarUrl) patch.avatarUrl = avatarUrl;
    if (!existing.followers) patch.followers = 'unknown';
    if (!existing.scoreHistory?.length) patch.scoreHistory = [{ t: new Date().toISOString(), s: existing.score ?? BASE_SCORE, cause: 'seed' }];
    if (!existing.breakdown) patch.breakdown = averageBreakdown();
    if (!existing.posts) patch.posts = [];

    if (Object.keys(patch).length) {
      await accountsRepo.update(profileId, patch);
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(`Public profiles complete. Created: ${created}. Updated: ${updated}. Skipped: ${skipped}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
