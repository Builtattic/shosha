import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as swipeRecordsRepo from '@/lib/repos/swipeRecords';
import * as usersRepo from '@/lib/repos/users';
import { invalidateProfileCaches } from '@/lib/profileData';

const swipeSchema = z.object({
  direction: z.enum(['align', 'oppose']),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) return fail('not_found', 'No profile exists for that id.', 404);

  const user = await getCurrentUser();
  if (!user) return fail('unauthorized', 'Sign in to rate people.', 401);

  const todayCount = await swipeRecordsRepo.countTodayForUser(user._id);
  if (todayCount >= 25) {
    return fail('rate_limited', 'You have reached your 25 swipe limit for today.', 429);
  }

  const account = await accountsRepo.findById(id.data);
  if (!account) return fail('not_found', 'No profile exists for that id.', 404);

  const json = await request.json().catch(() => null);
  const parsed = swipeSchema.safeParse(json);
  if (!parsed.success) return fail('validation_error', 'Invalid swipe direction.', 422);

  const record = await swipeRecordsRepo.upsertSwipe({
    accountId: account._id,
    userId: user._id,
    direction: parsed.data.direction,
  });

  const newTodayCount = todayCount + 1;
  let swiperBonusAwarded = false;
  if (newTodayCount % 10 === 0) {
    await usersRepo.applyDelta(user._id, 5, {
      cause: 'swipe',
      profileId: account._id,
      baseScore: user.score ?? 1000,
    });
    swiperBonusAwarded = true;
  }
  const swiperUser = await usersRepo.findById(user._id);
  const userScore = typeof swiperUser?.score === 'number' ? swiperUser.score : user.score ?? 1000;

  let following = false;

  if (parsed.data.direction === 'align') {
    const currentFollowingAccounts = user.followingAccounts ?? [];
    if (!currentFollowingAccounts.includes(account._id)) {
      await usersRepo.update(user._id, {
        followingAccounts: [...currentFollowingAccounts, account._id],
      });
    }

    if (account.claimedBy && account.claimedBy !== user._id) {
      const target = await usersRepo.findById(account.claimedBy);
      if (target) {
        const myFollowing = user.following ?? [];
        const theirFollowers = target.followers ?? [];
        if (!myFollowing.includes(target._id)) {
          await usersRepo.update(user._id, {
            following: [...myFollowing, target._id],
          });
        }
        if (!theirFollowers.includes(user._id)) {
          await usersRepo.update(target._id, {
            followers: [...theirFollowers, user._id],
          });
        }
      }
    }

    following = true;
  }

  const aggregate = await swipeRecordsRepo.getAccountSwipeScore(account._id);
  const newSwipeTotal = aggregate.score;
  // Net swipe total before this gesture (handles missing/out-of-sync swipeScore).
  const previousSwipeTotal =
    typeof account.swipeScore === 'number'
      ? account.swipeScore
      : newSwipeTotal - record.delta;
  const swipeDelta = newSwipeTotal - previousSwipeTotal;
  const currentTotal =
    typeof account.displayScore === 'number'
      ? account.displayScore
      : typeof account.score === 'number'
        ? account.score
        : 1000;
  const updatedScore = Math.round((currentTotal + swipeDelta) * 10) / 10;
  await accountsRepo.update(account._id, {
    score: updatedScore,
    displayScore: updatedScore,
    swipeScore: newSwipeTotal,
  });
  await invalidateProfileCaches(account);
  return ok({
    record,
    aggregate,
    following,
    score: updatedScore,
    userScore,
    todaySwipeCount: newTodayCount,
    swiperBonusAwarded,
    dailyLimit: 25,
  });
}
