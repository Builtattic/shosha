import { loadEnvConfig } from '@next/env';
import type { Platform, ScoreCause } from '../src/types';

loadEnvConfig(process.cwd());

process.env.FIREBASE_PROJECT_ID ||= 'shosha-local';
process.env.FIREBASE_DATABASE_URL ||= 'https://shosha-local-default-rtdb.firebaseio.com';
process.env.FIREBASE_STORAGE_BUCKET ||= 'shosha-local.appspot.com';

const SEED_ADMIN_ID = 'seed_admin';

function breakdownFromScore(score: number) {
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  return {
    authenticity: clamp(score + 4),
    engagement: clamp(score - 2),
    community: clamp(score + 1),
    content: clamp(score - 4),
    impact: clamp(score + 2)
  };
}

async function clearNode(adminDb: typeof import('../src/lib/firebase/admin').adminDb, name: string) {
  await adminDb().ref(name).remove();
}

async function main() {
  const [accountsRepo, reportsRepo, usersRepo, firebaseAdmin, scoring] = await Promise.all([
    import('../src/lib/repos/accounts'),
    import('../src/lib/repos/reports'),
    import('../src/lib/repos/users'),
    import('../src/lib/firebase/admin'),
    import('../src/lib/scoring'),
  ]);
  const { adminDb } = firebaseAdmin;
  const { averageBreakdown } = scoring;

  console.log('Connecting to Firebase RTDB at', process.env.FIREBASE_DATABASE_URL);

  await Promise.all([
    clearNode(adminDb, 'users'),
    clearNode(adminDb, 'accounts'),
    clearNode(adminDb, 'reports'),
    clearNode(adminDb, 'events'),
    clearNode(adminDb, 'auditRequests'),
    clearNode(adminDb, 'claimRequests')
  ]);

  await usersRepo.upsertFromClerk({
    id: SEED_ADMIN_ID,
    username: 'admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@shosha.local',
    role: 'admin'
  });

  const seeds: Array<[Platform, string, string]> = [
    ['x', 'cityledger', 'City Ledger'],
    ['instagram', 'studio.mira', 'Studio Mira'],
    ['x', 'openbazaar', 'Open Bazaar'],
    ['instagram', 'northline', 'Northline'],
    ['x', 'civicdispatch', 'Civic Dispatch'],
    ['instagram', 'marketroom', 'Market Room'],
    ['x', 'verifiedpulse', 'Verified Pulse'],
    ['instagram', 'framepublic', 'Frame Public'],
    ['x', 'commonthread', 'Common Thread'],
    ['instagram', 'brightcase', 'Bright Case']
  ];
  const scores = [88, 74, 62, 45, 39, 91, 57, 68, 33, 82];

  for (let index = 0; index < seeds.length; index += 1) {
    const [platform, username, displayName] = seeds[index];
    const score = scores[index];
    const account = await accountsRepo.create({
      platform,
      username,
      displayName,
      bio: `A seeded ${platform} profile for tribunal smoke tests.`,
      avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      verified: index % 3 === 0,
      followers: `${(index + 2) * 11}k`,
      score,
      scoreHistory: [
        { t: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), s: 60, cause: 'seed' as ScoreCause },
        {
          t: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          s: Math.round((60 + score) / 2),
          cause: 'report' as ScoreCause
        },
        { t: new Date().toISOString(), s: score, cause: 'report' as ScoreCause }
      ],
      breakdown: score === 60 ? averageBreakdown() : breakdownFromScore(score),
      posts: Array.from({ length: 3 }).map((_, postIndex) => ({
        externalId: `${username}-${postIndex}`,
        content: `Captured post ${postIndex + 1} from ${displayName}. Public API ingestion remains scaffolded.`,
        likes: `${(postIndex + 1) * (index + 4) * 12}`,
        replies: `${(postIndex + 1) * (index + 2)}`,
        capturedAt: new Date(Date.now() - postIndex * 24 * 60 * 60 * 1000).toISOString()
      })),
      claimed: false,
      claimedBy: null
    });

    for (let reportIndex = 0; reportIndex < 3; reportIndex += 1) {
      const positive = reportIndex % 2 === 0;
      await reportsRepo.create({
        accountId: account._id,
        reporterId: SEED_ADMIN_ID,
        anonymousTag: 'admin',
        type: positive ? 'positive' : 'negative',
        description: positive
          ? `${displayName} handled a public exchange with clear receipts and steady follow through.`
          : `${displayName} left a complaint unresolved after multiple public replies asked for clarity.`,
        feelings: positive
          ? 'The interaction felt calm, accountable, and unusually transparent.'
          : 'The silence felt dismissive and made the thread harder to trust.',
        media: {
          url: `https://api.dicebear.com/9.x/shapes/svg?seed=${username}-${reportIndex}`,
          type: 'image',
          width: 512,
          height: 512,
          bytes: 2048,
          publicId: `seed/${username}/${reportIndex}`
        },
        status: 'approved',
        aiVerdict: {
          valid: true,
          confidence: 0.72,
          proposedImpact: positive ? 3 : -3,
          reasoning: 'Seeded filing with concrete public context.',
          categoryTags: positive ? ['community', 'professionalism'] : ['community', 'content'],
          abuseFlags: [],
          analyzedAt: new Date().toISOString()
        },
        adminDecision: {
          adminId: SEED_ADMIN_ID,
          verdict: 'approved',
          finalImpact: positive ? 3 : -3,
          note: 'Seeded approval',
          decidedAt: new Date().toISOString()
        }
      });
    }
  }

  console.log(`Seeded Shosha. Admin RTDB node id: ${SEED_ADMIN_ID}.`);
  console.log('Sign in with Clerk, then in the Clerk dashboard set publicMetadata.role = "admin" on your user.');
  console.log('On your next request, getCurrentUser() will create the RTDB user node tied to your Clerk id.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
