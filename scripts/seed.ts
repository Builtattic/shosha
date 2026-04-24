import bcrypt from 'bcrypt';
import { connectDb } from '../src/lib/db';
import { averageBreakdown } from '../src/lib/scoring';
import { Account } from '../src/models/Account';
import { Report } from '../src/models/Report';
import { User } from '../src/models/User';

const platforms = ['x', 'instagram'] as const;

function breakdownFromScore(score: number) {
  return {
    authenticity: Math.max(0, Math.min(100, score + 4)),
    engagement: Math.max(0, Math.min(100, score - 2)),
    community: Math.max(0, Math.min(100, score + 1)),
    content: Math.max(0, Math.min(100, score - 4)),
    impact: Math.max(0, Math.min(100, score + 2))
  };
}

async function main() {
  process.env.MONGODB_URI ??= 'mongodb://localhost:27017/shosha';
  await connectDb();
  await Promise.all([User.deleteMany({}), Account.deleteMany({}), Report.deleteMany({})]);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin-password-123';
  const admin = await User.create({
    username: 'admin',
    email: 'admin@shosha.local',
    passwordHash: await bcrypt.hash(adminPassword, 12),
    role: 'admin'
  });

  const names = [
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
  ] as const;
  const scores = [88, 74, 62, 45, 39, 91, 57, 68, 33, 82];

  for (let index = 0; index < names.length; index += 1) {
    const [platform, username, displayName] = names[index];
    const score = scores[index];
    const account = await Account.create({
      platform,
      username,
      displayName,
      bio: `A seeded ${platforms.includes(platform) ? platform : 'social'} profile for tribunal smoke tests.`,
      avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      verified: index % 3 === 0,
      followers: `${(index + 2) * 11}k`,
      score,
      scoreHistory: [
        { t: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), s: 60, cause: 'seed' },
        { t: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), s: Math.round((60 + score) / 2), cause: 'report' },
        { t: new Date(), s: score, cause: 'report' }
      ],
      breakdown: score === 60 ? averageBreakdown() : breakdownFromScore(score),
      posts: Array.from({ length: 3 }).map((_, postIndex) => ({
        externalId: `${username}-${postIndex}`,
        content: `Captured post ${postIndex + 1} from ${displayName}. Public API ingestion remains scaffolded.`,
        likes: `${(postIndex + 1) * (index + 4) * 12}`,
        replies: `${(postIndex + 1) * (index + 2)}`,
        capturedAt: new Date(Date.now() - postIndex * 24 * 60 * 60 * 1000)
      }))
    });

    for (let reportIndex = 0; reportIndex < 3; reportIndex += 1) {
      const positive = reportIndex % 2 === 0;
      await Report.create({
        accountId: account._id,
        reporterId: admin._id,
        anonymousTag: 'admin',
        type: positive ? 'positive' : 'negative',
        description: positive
          ? `${displayName} handled a public exchange with clear receipts and steady follow through.`
          : `${displayName} left a complaint unresolved after multiple public replies asked for clarity.`,
        feelings: positive
          ? 'The interaction felt calm, accountable, and unusually transparent.'
          : 'The silence felt dismissive and made the thread harder to trust.',
        media: {
          publicId: `seed/${username}/${reportIndex}`,
          url: `https://api.dicebear.com/9.x/shapes/svg?seed=${username}-${reportIndex}`,
          type: 'image',
          width: 512,
          height: 512,
          bytes: 2048
        },
        status: 'approved',
        aiVerdict: {
          valid: true,
          confidence: 0.72,
          proposedImpact: positive ? 3 : -3,
          reasoning: 'Seeded filing with concrete public context.',
          categoryTags: positive ? ['community', 'professionalism'] : ['community', 'content'],
          abuseFlags: [],
          analyzedAt: new Date()
        },
        adminDecision: {
          adminId: admin._id,
          verdict: 'approved',
          finalImpact: positive ? 3 : -3,
          note: 'Seeded approval',
          decidedAt: new Date()
        }
      });
    }
  }

  console.log(`Seeded Shosha with admin/admin-password-123 fallback. Admin password used: ${adminPassword}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
