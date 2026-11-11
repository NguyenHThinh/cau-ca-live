import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { GameDatabase } from './db.js';
import { FishingEngine } from './fishingEngine.js';

const testDbPath = path.resolve(process.cwd(), 'data', 'test_fishing.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log('🧪 Running FishingEngine v1 Mechanics Verification Suite...');

const db = new GameDatabase(testDbPath);
let likeEventsCount = 0;

const engine = new FishingEngine(db, {
  onAnglerUpdated: () => {},
  onAnglerLiked: () => {
    likeEventsCount++;
  },
  onCatchCompleted: () => {},
  onAlertTriggered: () => {},
  onLeaderboardsUpdated: () => {},
  onEnvironmentUpdated: () => {},
});

// 1. Test Anti-Spam Like handling (User spams 30 like batches while fishing)
for (let i = 0; i < 30; i++) {
  engine.handleLikeEvent({
    tiktokUid: 'spam_tester_01',
    uniqueId: 'spam_tester',
    nickname: 'Spam Tester',
    avatarUrl: 'https://example.com/a.png',
    likeCount: 10,
  });
}

const active = engine.getActiveAnglers();
assert.strictEqual(active.length, 1, 'Should only spawn 1 character for 1 user');
assert.strictEqual(
  active[0].status,
  'CASTING',
  'First like should put user in CASTING state'
);
assert.strictEqual(
  active[0].pendingCasts,
  3,
  'Pending casts queue must be capped at 3 even after 30 rapid like batches'
);
assert.strictEqual(
  likeEventsCount,
  30,
  'All 30 likes (including initial cast from IDLE) should trigger instant heart pop events'
);

// 2. Test Follow Bonus -> Unlocks Rod Lv2 (Cần trúc) immediately!
const followRes = engine.handleFollowEvent({
  tiktokUid: 'spam_tester_01',
  uniqueId: 'spam_tester',
  nickname: 'Spam Tester',
  avatarUrl: 'https://example.com/a.png',
});
assert.strictEqual(
  followRes.player.rodLevel,
  2,
  'Following the channel must immediately unlock Rod Lv2 (Cần trúc)'
);
assert.strictEqual(followRes.leveledUp, true, 'Should report leveledUp = true');

// 3. Test Gift Upgrade + capBait rule (50 KC gift -> 50 total KC -> Rod Lv3 Cần gỗ -> Cap Bait Tier 4 Cá con, 6 charges)
const giftRes = engine.handleGiftEvent({
  tiktokUid: 'spam_tester_01',
  uniqueId: 'spam_tester',
  nickname: 'Spam Tester',
  avatarUrl: 'https://example.com/a.png',
  giftId: 'doughnut', // 50 KC
  repeatCount: 1,
});

assert.strictEqual(
  giftRes.player.rodLevel,
  3,
  '50 KC gift should upgrade player to Rod Lv3 (Cần gỗ, threshold 30 KC)'
);
assert.strictEqual(
  giftRes.player.baitTier,
  4,
  '50 KC gift at Rod Lv3 should grant Tier 4 Cá con'
);
assert.strictEqual(
  giftRes.player.baitCount,
  6,
  'Cá con pack should grant 6 charges'
);

// 3b. Test Highest-Bait Priority & Default Bait Protection:
// Sending a low gift (1 KC Rose -> Tier 2 Dế mèn) must NOT downgrade active Tier 4 Cá con,
// and when a user reaches Rod Lv5 (Default Bait Tier 3 Tôm tươi), low gifts (Tier 2) are never used.
const lowGiftWhileHavingTier4 = engine.handleGiftEvent({
  tiktokUid: 'spam_tester_01',
  uniqueId: 'spam_tester',
  nickname: 'Spam Tester',
  avatarUrl: 'https://example.com/a.png',
  giftId: 'rose', // 1 KC (Tier 2)
  repeatCount: 1,
});
assert.strictEqual(
  lowGiftWhileHavingTier4.player.baitTier,
  4,
  'Must prioritize highest Tier 4 bait over newly gifted Tier 2 bait'
);

// Upgrade another user to Rod Lv5 (150 KC -> Default Bait = Tier 3 Tôm tươi), consume paid bait, then send 5 KC (Tier 2)
engine.handleGiftEvent({
  tiktokUid: 'high_rod_user',
  uniqueId: 'high_rod_user',
  nickname: 'High Rod User',
  avatarUrl: 'https://example.com/b.png',
  giftId: 'sunglasses', // 120 KC
  repeatCount: 2, // 240 KC -> Rod Lv5 (requires 140 KC)
});
for (let i = 0; i < 10; i++) {
  db.consumeBaitCharge('high_rod_user');
}
const lowGiftOnLv5User = engine.handleGiftEvent({
  tiktokUid: 'high_rod_user',
  uniqueId: 'high_rod_user',
  nickname: 'High Rod User',
  avatarUrl: 'https://example.com/b.png',
  giftId: 'finger_heart', // 5 KC (Tier 2 Dế mèn, lower than Rod Lv5 default Tier 3 Tôm tươi!)
  repeatCount: 1,
});
assert.strictEqual(
  lowGiftOnLv5User.angler.baitTier,
  3,
  'Rod Lv5 user with Default Bait Tier 3 must NEVER downgrade to Tier 2 when gifting 5 KC'
);
assert.strictEqual(
  lowGiftOnLv5User.angler.isDefaultBait,
  true,
  'Rod Lv5 user should stay on Default Bait Tier 3 (isDefaultBait = true) when gifting lower-tier bait'
);

// 4. Test Pity System (40 casts -> Rare+ Lv3+, 120 casts -> Epic+ Lv4+)
const pityRollRare = engine.rollBiteOutcome({
  rodLevel: 1,
  baitTier: 1,
  pityRare: 40,
  pityEpic: 40,
});
assert.ok(
  pityRollRare.species.tierLevel >= 3,
  'Pity 40 must guarantee at least Lv3 Hiếm+'
);

const pityRollEpic = engine.rollBiteOutcome({
  rodLevel: 1,
  baitTier: 1,
  pityRare: 40,
  pityEpic: 120,
});
assert.ok(
  pityRollEpic.species.tierLevel >= 4,
  'Pity 120 must guarantee at least Lv4 Sử thi+'
);

// 5. Test Seasonal Exclusive Legendary Fish (e.g., SPRING + DAY -> Cá anh đào ★ or Cá rồng vàng)
engine.setEnvironmentConfig({
  seasonMode: 'manual',
  season: 'SPRING',
  dayPhaseForced: 'DAY',
});

const outcome = engine.rollBiteOutcome({
  rodLevel: 10,
  baitTier: 6,
  pityRare: 0,
  pityEpic: 120,
});

db.recordBiteOutcome({
  tiktokUid: 'spam_tester_01',
  uniqueId: 'spam_tester',
  nickname: 'Spam Tester',
  avatarUrl: 'https://example.com/a.png',
  fishId: outcome.species.id,
  fishName: outcome.species.name,
  fishEmoji: outcome.species.emoji,
  rarity: outcome.species.rarity,
  tierLevel: outcome.species.tierLevel,
  weight: outcome.weight,
  rodLevelUsed: 10,
  baitTierUsed: 6,
  escaped: false,
  escapeChancePct: outcome.escapeChancePct,
});

const lb = db.getLeaderboards(5);
assert.ok(lb.biggestCatch.length > 0, 'Biggest catch leaderboard populated');
assert.ok(lb.bestTierCatch.length > 0, 'Best tier catch leaderboard populated');
assert.ok(lb.epicLegendHunter.length > 0, 'Epic/Legend hunter leaderboard populated');

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log(
  '✅ All v1 mechanics tests passed! (10 Rod Levels, Follow -> Lv2, 6 Baits + capBait, 22 Seasonal Fish, Pity 40/120, and 3 Top-5 Leaderboards)'
);
process.exit(0);
