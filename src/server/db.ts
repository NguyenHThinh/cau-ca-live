import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  BaitStockMap,
  CatchResult,
  FishRarity,
  LeaderboardBundle,
  PlayerProfile,
} from '../shared/types.js';
import {
  calculateRodLevelFromKc,
  getCapBaitTier,
  getDefaultBaitTier,
  RARITY_ORDER,
  resolveGiftBaitReward,
} from '../shared/gameConfig.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'fishing_live.sqlite');
const BAIT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class GameDatabase {
  private db: DatabaseSync;

  constructor(customPath?: string) {
    this.db = new DatabaseSync(customPath || DB_PATH);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS players (
        tiktok_uid TEXT PRIMARY KEY,
        unique_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        is_follower INTEGER NOT NULL DEFAULT 0,
        diamonds_kc INTEGER NOT NULL DEFAULT 0,
        rod_level INTEGER NOT NULL DEFAULT 1,
        bait_tier INTEGER NOT NULL DEFAULT 1,
        bait_count INTEGER NOT NULL DEFAULT 0,
        bait_stock_json TEXT NOT NULL DEFAULT '{}',
        pity_rare INTEGER NOT NULL DEFAULT 0,
        pity_epic INTEGER NOT NULL DEFAULT 0,
        total_weight REAL NOT NULL DEFAULT 0,
        total_catches INTEGER NOT NULL DEFAULT 0,
        max_fish_weight REAL NOT NULL DEFAULT 0,
        max_fish_name TEXT NOT NULL DEFAULT '',
        max_fish_emoji TEXT NOT NULL DEFAULT '🐟',
        max_fish_rarity TEXT NOT NULL DEFAULT 'COMMON',
        rarest_fish_name TEXT NOT NULL DEFAULT '',
        rarest_fish_emoji TEXT NOT NULL DEFAULT '🐟',
        rarest_fish_rarity TEXT NOT NULL DEFAULT 'COMMON',
        rarest_fish_tier_order INTEGER NOT NULL DEFAULT 0,
        rarest_fish_weight REAL NOT NULL DEFAULT 0,
        legendary_count INTEGER NOT NULL DEFAULT 0,
        epic_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS catches (
        id TEXT PRIMARY KEY,
        player_uid TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        fish_id TEXT NOT NULL,
        fish_name TEXT NOT NULL,
        fish_emoji TEXT NOT NULL,
        rarity TEXT NOT NULL,
        tier_level INTEGER NOT NULL DEFAULT 1,
        weight REAL NOT NULL,
        rod_level_used INTEGER NOT NULL,
        bait_tier_used INTEGER NOT NULL,
        caught_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gift_logs (
        id TEXT PRIMARY KEY,
        player_uid TEXT NOT NULL,
        nickname TEXT NOT NULL,
        gift_id TEXT NOT NULL,
        gift_name TEXT NOT NULL,
        diamonds INTEGER NOT NULL,
        bait_tier_granted INTEGER NOT NULL,
        bait_count_granted INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Safe column migrations for existing SQLite files from prototype
    const safeAlter = [
      `ALTER TABLE players ADD COLUMN is_follower INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE players ADD COLUMN diamonds_kc INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE players ADD COLUMN bait_stock_json TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE players ADD COLUMN pity_rare INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE players ADD COLUMN pity_epic INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE players ADD COLUMN rarest_fish_tier_order INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE players ADD COLUMN rarest_fish_weight REAL NOT NULL DEFAULT 0`,
      `ALTER TABLE catches ADD COLUMN tier_level INTEGER NOT NULL DEFAULT 1`,
    ];
    for (const sql of safeAlter) {
      try {
        this.db.exec(sql);
      } catch {
        // Column already exists
      }
    }

    // Normalize any legacy MYTHIC rarities to LEGENDARY so v1 5-tier system is 100% clean
    this.db.exec(`
      UPDATE players SET max_fish_rarity = 'LEGENDARY' WHERE max_fish_rarity = 'MYTHIC';
      UPDATE players SET rarest_fish_rarity = 'LEGENDARY' WHERE rarest_fish_rarity = 'MYTHIC';
      UPDATE catches SET rarity = 'LEGENDARY' WHERE rarity = 'MYTHIC';
    `);
  }

  private parseAndCleanBaitStock(rawJson: unknown, nowMs = Date.now()): BaitStockMap {
    const stock: BaitStockMap = {};
    if (typeof rawJson === 'string' && rawJson.trim()) {
      try {
        const parsed = JSON.parse(rawJson) as Record<string, { count: number; expiresAt: number }>;
        for (const [k, val] of Object.entries(parsed)) {
          const tier = Number(k);
          if (
            tier >= 2 &&
            tier <= 6 &&
            val &&
            val.count > 0 &&
            (!val.expiresAt || val.expiresAt > nowMs)
          ) {
            stock[tier] = {
              count: Math.floor(val.count),
              expiresAt: val.expiresAt || nowMs + BAIT_EXPIRY_MS,
            };
          }
        }
      } catch {
        // Ignore invalid JSON
      }
    }
    return stock;
  }

  private resolveActiveBaitFromStock(
    rodLevel: number,
    stock: BaitStockMap
  ): { baitTier: number; baitCount: number; isDefault: boolean } {
    const capTier = getCapBaitTier(rodLevel);
    const defTier = getDefaultBaitTier(rodLevel);
    // Prioritize highest bait tier first; never use a bait tier lower/equal to the rod's infinite default bait
    for (let t = capTier; t > defTier; t--) {
      const entry = stock[t];
      if (entry && entry.count > 0) {
        return { baitTier: t, baitCount: entry.count, isDefault: false };
      }
    }
    return {
      baitTier: defTier,
      baitCount: 0,
      isDefault: true,
    };
  }

  public getOrCreatePlayer(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
    isFollower?: boolean;
  }): PlayerProfile {
    const existing = this.db
      .prepare('SELECT * FROM players WHERE tiktok_uid = ?')
      .get(params.tiktokUid) as Record<string, unknown> | undefined;

    const now = new Date().toISOString();

    if (existing) {
      const isFollower =
        Boolean(existing.is_follower) || Boolean(params.isFollower);
      const diamondsKc = Number(existing.diamonds_kc || existing.rod_exp || 0);
      const rodLevel = calculateRodLevelFromKc(diamondsKc, isFollower);
      const stock = this.parseAndCleanBaitStock(existing.bait_stock_json);
      const activeBait = this.resolveActiveBaitFromStock(rodLevel, stock);

      this.db
        .prepare(
          `UPDATE players
           SET unique_id = ?, nickname = ?, avatar_url = ?,
               is_follower = ?, diamonds_kc = ?, rod_level = ?,
               bait_tier = ?, bait_count = ?, bait_stock_json = ?, updated_at = ?
           WHERE tiktok_uid = ?`
        )
        .run(
          params.uniqueId,
          params.nickname,
          params.avatarUrl,
          isFollower ? 1 : 0,
          diamondsKc,
          rodLevel,
          activeBait.baitTier,
          activeBait.baitCount,
          JSON.stringify(stock),
          now,
          params.tiktokUid
        );

      const refreshed = this.db
        .prepare('SELECT * FROM players WHERE tiktok_uid = ?')
        .get(params.tiktokUid) as Record<string, unknown>;
      return this.mapRowToPlayer(refreshed);
    }

    const isFollower = Boolean(params.isFollower);
    const initialRodLevel = calculateRodLevelFromKc(0, isFollower);
    const initialBaitTier = getDefaultBaitTier(initialRodLevel);

    this.db
      .prepare(
        `INSERT INTO players (
          tiktok_uid, unique_id, nickname, avatar_url,
          is_follower, diamonds_kc, rod_level, bait_tier, bait_count, bait_stock_json,
          pity_rare, pity_epic,
          total_weight, total_catches, max_fish_weight, max_fish_name, max_fish_emoji, max_fish_rarity,
          rarest_fish_name, rarest_fish_emoji, rarest_fish_rarity, rarest_fish_tier_order, rarest_fish_weight,
          legendary_count, epic_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, '{}', 0, 0, 0, 0, 0, '', '🐟', 'COMMON', '', '🐟', 'COMMON', 0, 0, 0, 0, ?)`
      )
      .run(
        params.tiktokUid,
        params.uniqueId,
        params.nickname,
        params.avatarUrl,
        isFollower ? 1 : 0,
        initialRodLevel,
        initialBaitTier,
        now
      );

    const created = this.db
      .prepare('SELECT * FROM players WHERE tiktok_uid = ?')
      .get(params.tiktokUid) as Record<string, unknown>;

    return this.mapRowToPlayer(created);
  }

  /**
   * Unlocks Rod Lv2 (Cần trúc) when a user follows the streamer on TikTok Live!
   */
  public applyFollowBonus(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
  }): {
    player: PlayerProfile;
    previousRodLevel: number;
    leveledUp: boolean;
  } {
    const existing = this.getOrCreatePlayer({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
    });

    const previousRodLevel = existing.rodLevel;
    const updated = this.getOrCreatePlayer({
      ...params,
      isFollower: true,
    });

    return {
      player: updated,
      previousRodLevel,
      leveledUp: updated.rodLevel > previousRodLevel,
    };
  }

  /**
   * Applies Gift KC to cumulative Rod progression + grants Bait package with capBait rule (Mục 4 & 5).
   */
  public applyGiftUpgrade(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
    giftId: string;
    giftName: string;
    diamonds: number; // Total KC of this gift event
  }): {
    player: PlayerProfile;
    previousRodLevel: number;
    leveledUp: boolean;
    grantedBaitTier: number;
    grantedBaitName: string;
    grantedBaitEmoji: string;
    grantedBaitCount: number;
    wasBaitCapped: boolean;
    rawBaitName: string;
  } {
    const player = this.getOrCreatePlayer({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
    });

    const previousRodLevel = player.rodLevel;
    const addedKc = Math.max(1, Math.round(params.diamonds));
    const newDiamondsKc = player.diamondsKc + addedKc;
    const newRodLevel = calculateRodLevelFromKc(newDiamondsKc, player.isFollower);

    // Determine bait reward & apply capBait(newRodLevel)
    const reward = resolveGiftBaitReward(addedKc, newRodLevel);
    const defTier = getDefaultBaitTier(newRodLevel);
    const stock = { ...player.baitStock };

    // Clean any stock entries <= defTier since default bait is infinite and higher/equal
    for (let t = 1; t <= defTier; t++) {
      if (stock[t]) {
        delete stock[t];
      }
    }

    // Only store paid bait if its tier is strictly higher than the rod's infinite default bait
    const tierKey = reward.grantedBait.tier;
    if (tierKey > defTier) {
      const currentCount = stock[tierKey]?.count || 0;
      stock[tierKey] = {
        count: currentCount + reward.countGranted,
        expiresAt: Date.now() + BAIT_EXPIRY_MS,
      };
    }

    const activeBait = this.resolveActiveBaitFromStock(newRodLevel, stock);
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE players
         SET diamonds_kc = ?, rod_level = ?, bait_tier = ?, bait_count = ?, bait_stock_json = ?, updated_at = ?
         WHERE tiktok_uid = ?`
      )
      .run(
        newDiamondsKc,
        newRodLevel,
        activeBait.baitTier,
        activeBait.baitCount,
        JSON.stringify(stock),
        now,
        params.tiktokUid
      );

    const logId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.db
      .prepare(
        `INSERT INTO gift_logs (
          id, player_uid, nickname, gift_id, gift_name,
          diamonds, bait_tier_granted, bait_count_granted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        logId,
        params.tiktokUid,
        params.nickname,
        params.giftId,
        params.giftName,
        addedKc,
        reward.grantedBait.tier,
        reward.countGranted,
        now
      );

    const updated = this.getOrCreatePlayer({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
    });

    return {
      player: updated,
      previousRodLevel,
      leveledUp: newRodLevel > previousRodLevel,
      grantedBaitTier: reward.grantedBait.tier,
      grantedBaitName: reward.grantedBait.name,
      grantedBaitEmoji: reward.grantedBait.emoji,
      grantedBaitCount: reward.countGranted,
      wasBaitCapped: reward.wasCapped,
      rawBaitName: reward.rawBait.name,
    };
  }

  /**
   * Picks the highest available bait in stock (<= capBait(rodLv)) and decrements 1 charge,
   * or falls back to infinite defaultBait(rodLv).
   */
  public consumeBaitCharge(tiktokUid: string): {
    baitTierUsed: number;
    remainingBaitCount: number;
    currentBaitTier: number;
    isDefaultBait: boolean;
  } {
    const row = this.db
      .prepare('SELECT rod_level, bait_stock_json FROM players WHERE tiktok_uid = ?')
      .get(tiktokUid) as { rod_level: number; bait_stock_json: string } | undefined;

    if (!row) {
      return {
        baitTierUsed: 1,
        remainingBaitCount: 0,
        currentBaitTier: 1,
        isDefaultBait: true,
      };
    }

    const rodLevel = Number(row.rod_level || 1);
    const stock = this.parseAndCleanBaitStock(row.bait_stock_json);
    const capTier = getCapBaitTier(rodLevel);
    const defTier = getDefaultBaitTier(rodLevel);

    for (let t = 1; t <= defTier; t++) {
      if (stock[t]) {
        delete stock[t];
      }
    }

    let usedTier: number | null = null;
    for (let t = capTier; t > defTier; t--) {
      if (stock[t] && stock[t].count > 0) {
        usedTier = t;
        stock[t].count -= 1;
        if (stock[t].count <= 0) {
          delete stock[t];
        }
        break;
      }
    }

    if (usedTier === null) {
      return {
        baitTierUsed: defTier,
        remainingBaitCount: 0,
        currentBaitTier: defTier,
        isDefaultBait: true,
      };
    }

    const nextActive = this.resolveActiveBaitFromStock(rodLevel, stock);
    this.db
      .prepare(
        `UPDATE players
         SET bait_tier = ?, bait_count = ?, bait_stock_json = ?, updated_at = ?
         WHERE tiktok_uid = ?`
      )
      .run(
        nextActive.baitTier,
        nextActive.baitCount,
        JSON.stringify(stock),
        new Date().toISOString(),
        tiktokUid
      );

    return {
      baitTierUsed: usedTier,
      remainingBaitCount: nextActive.baitCount,
      currentBaitTier: nextActive.baitTier,
      isDefaultBait: nextActive.isDefault,
    };
  }

  /**
   * Updates Pity counters after rolling a fish tier, and if not escaped, records the catch.
   */
  public recordBiteOutcome(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
    fishId: string;
    fishName: string;
    fishEmoji: string;
    rarity: FishRarity;
    tierLevel: number;
    weight: number;
    rodLevelUsed: number;
    baitTierUsed: number;
    escaped: boolean;
    escapeChancePct: number;
  }): {
    player: PlayerProfile;
    catchResult: CatchResult;
  } {
    const player = this.getOrCreatePlayer({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
    });

    // Update Pity counters (Mục 8.2: 40 casts for Rare+, 120 casts for Epic+ only on Rod Lv3+)
    const newPityRare = params.tierLevel >= 3 ? 0 : player.pityRare + 1;
    const newPityEpic =
      params.tierLevel >= 4
        ? 0
        : player.rodLevel >= 3
        ? player.pityEpic + 1
        : player.pityEpic;
    const now = new Date().toISOString();
    const catchId = `catch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (params.escaped) {
      this.db
        .prepare(
          `UPDATE players
           SET pity_rare = ?, pity_epic = ?, updated_at = ?
           WHERE tiktok_uid = ?`
        )
        .run(newPityRare, newPityEpic, now, params.tiktokUid);

      const updatedPlayer = this.getOrCreatePlayer({
        tiktokUid: params.tiktokUid,
        uniqueId: params.uniqueId,
        nickname: params.nickname,
        avatarUrl: params.avatarUrl,
      });

      return {
        player: updatedPlayer,
        catchResult: {
          id: catchId,
          playerUid: params.tiktokUid,
          nickname: params.nickname,
          avatarUrl: params.avatarUrl,
          fishId: params.fishId,
          fishName: params.fishName,
          fishEmoji: params.fishEmoji,
          rarity: params.rarity,
          tierLevel: params.tierLevel,
          weight: params.weight,
          rodLevelUsed: params.rodLevelUsed,
          baitTierUsed: params.baitTierUsed,
          escaped: true,
          escapeChancePct: params.escapeChancePct,
          isNewPersonalBest: false,
          isGlobalRecord: false,
          caughtAt: now,
        },
      };
    }

    // Check current global max weight before updating
    const globalMaxRow = this.db
      .prepare('SELECT MAX(max_fish_weight) as global_max FROM players')
      .get() as { global_max: number | null } | undefined;
    const previousGlobalMax = globalMaxRow?.global_max || 0;

    const isNewPersonalBest = params.weight > player.maxFishWeight;
    const isGlobalRecord =
      params.weight > previousGlobalMax && params.weight >= 15;

    const newTotalWeight = Number((player.totalWeight + params.weight).toFixed(2));
    const newTotalCatches = player.totalCatches + 1;

    const newMaxWeight = isNewPersonalBest ? params.weight : player.maxFishWeight;
    const newMaxName = isNewPersonalBest ? params.fishName : player.maxFishName;
    const newMaxEmoji = isNewPersonalBest ? params.fishEmoji : player.maxFishEmoji;
    const newMaxRarity = isNewPersonalBest ? params.rarity : player.maxFishRarity;

    const newLegendaryCount =
      player.legendaryCount + (params.rarity === 'LEGENDARY' ? 1 : 0);
    const newEpicCount =
      player.epicCount + (params.rarity === 'EPIC' ? 1 : 0);

    // Best Tier Catch comparison: Higher Tier wins; if equal Tier, heavier weight wins!
    const currentBestTierOrder = RARITY_ORDER[player.rarestFishRarity] || 0;
    const caughtTierOrder = RARITY_ORDER[params.rarity] || 1;
    const isNewBestTierCatch =
      !player.rarestFishName ||
      caughtTierOrder > currentBestTierOrder ||
      (caughtTierOrder === currentBestTierOrder &&
        params.weight > player.rarestFishWeight);

    const newRarestName = isNewBestTierCatch
      ? params.fishName
      : player.rarestFishName;
    const newRarestEmoji = isNewBestTierCatch
      ? params.fishEmoji
      : player.rarestFishEmoji;
    const newRarestRarity = isNewBestTierCatch
      ? params.rarity
      : player.rarestFishRarity;
    const newRarestTierOrder = isNewBestTierCatch
      ? caughtTierOrder
      : currentBestTierOrder;
    const newRarestWeight = isNewBestTierCatch
      ? params.weight
      : player.rarestFishWeight;

    this.db
      .prepare(
        `UPDATE players SET
          pity_rare = ?,
          pity_epic = ?,
          total_weight = ?,
          total_catches = ?,
          max_fish_weight = ?,
          max_fish_name = ?,
          max_fish_emoji = ?,
          max_fish_rarity = ?,
          legendary_count = ?,
          epic_count = ?,
          rarest_fish_name = ?,
          rarest_fish_emoji = ?,
          rarest_fish_rarity = ?,
          rarest_fish_tier_order = ?,
          rarest_fish_weight = ?,
          updated_at = ?
         WHERE tiktok_uid = ?`
      )
      .run(
        newPityRare,
        newPityEpic,
        newTotalWeight,
        newTotalCatches,
        newMaxWeight,
        newMaxName,
        newMaxEmoji,
        newMaxRarity,
        newLegendaryCount,
        newEpicCount,
        newRarestName,
        newRarestEmoji,
        newRarestRarity,
        newRarestTierOrder,
        newRarestWeight,
        now,
        params.tiktokUid
      );

    this.db
      .prepare(
        `INSERT INTO catches (
          id, player_uid, nickname, avatar_url,
          fish_id, fish_name, fish_emoji, rarity, tier_level, weight,
          rod_level_used, bait_tier_used, caught_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        catchId,
        params.tiktokUid,
        params.nickname,
        params.avatarUrl,
        params.fishId,
        params.fishName,
        params.fishEmoji,
        params.rarity,
        params.tierLevel,
        params.weight,
        params.rodLevelUsed,
        params.baitTierUsed,
        now
      );

    const updatedPlayer = this.getOrCreatePlayer({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
    });

    const catchResult: CatchResult = {
      id: catchId,
      playerUid: params.tiktokUid,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
      fishId: params.fishId,
      fishName: params.fishName,
      fishEmoji: params.fishEmoji,
      rarity: params.rarity,
      tierLevel: params.tierLevel,
      weight: params.weight,
      rodLevelUsed: params.rodLevelUsed,
      baitTierUsed: params.baitTierUsed,
      escaped: false,
      escapeChancePct: params.escapeChancePct,
      isNewPersonalBest,
      isGlobalRecord,
      caughtAt: now,
    };

    return {
      player: updatedPlayer,
      catchResult,
    };
  }

  /**
   * 3 BẢNG XẾP HẠNG TOP 5 THEO ĐÚNG MỤC 12 BẢNG THIẾT KẾ V1:
   * 1. Người câu cá nặng nhất (Best single fish weight)
   * 2. Cá xịn nhất mọi thời đại (Fish Tier DESC -> Fish Weight DESC)
   * 3. Thợ săn cá xịn (Total Sử thi + Huyền thoại DESC -> Total Weight DESC)
   */
  public getLeaderboards(limit = 5): LeaderboardBundle {
    const biggestRows = this.db
      .prepare(
        `SELECT * FROM players
         WHERE max_fish_weight > 0
         ORDER BY max_fish_weight DESC
         LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[];

    const bestTierRows = this.db
      .prepare(
        `SELECT * FROM players
         WHERE max_fish_weight > 0
         ORDER BY rarest_fish_tier_order DESC, rarest_fish_weight DESC, max_fish_weight DESC
         LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[];

    const hunterRows = this.db
      .prepare(
        `SELECT * FROM players
         WHERE total_weight > 0
         ORDER BY (legendary_count + epic_count) DESC, legendary_count DESC, total_weight DESC
         LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[];

    return {
      biggestCatch: biggestRows.map((row, idx) => ({
        rank: idx + 1,
        tiktokUid: String(row.tiktok_uid),
        nickname: String(row.nickname),
        avatarUrl: String(row.avatar_url),
        rodLevel: Number(row.rod_level),
        maxFishWeight: Number(row.max_fish_weight),
        maxFishName: String(row.max_fish_name),
        maxFishEmoji: String(row.max_fish_emoji),
        maxFishRarity: (String(row.max_fish_rarity) || 'COMMON') as FishRarity,
      })),
      bestTierCatch: bestTierRows.map((row, idx) => ({
        rank: idx + 1,
        tiktokUid: String(row.tiktok_uid),
        nickname: String(row.nickname),
        avatarUrl: String(row.avatar_url),
        rodLevel: Number(row.rod_level),
        rarestFishRarity: (String(row.rarest_fish_rarity) ||
          String(row.max_fish_rarity) ||
          'COMMON') as FishRarity,
        rarestFishName:
          String(row.rarest_fish_name) || String(row.max_fish_name),
        rarestFishEmoji:
          String(row.rarest_fish_emoji) || String(row.max_fish_emoji),
        rarestFishWeight:
          Number(row.rarest_fish_weight) || Number(row.max_fish_weight),
      })),
      epicLegendHunter: hunterRows.map((row, idx) => {
        const leg = Number(row.legendary_count || 0);
        const ep = Number(row.epic_count || 0);
        return {
          rank: idx + 1,
          tiktokUid: String(row.tiktok_uid),
          nickname: String(row.nickname),
          avatarUrl: String(row.avatar_url),
          rodLevel: Number(row.rod_level),
          epicLegendCount: leg + ep,
          legendaryCount: leg,
          epicCount: ep,
          totalWeight: Number(row.total_weight || 0),
        };
      }),
    };
  }

  public getRecentCatches(limit = 10): CatchResult[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM catches
         ORDER BY caught_at DESC
         LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      playerUid: String(r.player_uid),
      nickname: String(r.nickname),
      avatarUrl: String(r.avatar_url),
      fishId: String(r.fish_id),
      fishName: String(r.fish_name),
      fishEmoji: String(r.fish_emoji),
      rarity: (String(r.rarity) || 'COMMON') as FishRarity,
      tierLevel: Number(r.tier_level || 1),
      weight: Number(r.weight),
      rodLevelUsed: Number(r.rod_level_used),
      baitTierUsed: Number(r.bait_tier_used),
      escaped: false,
      isNewPersonalBest: false,
      isGlobalRecord: false,
      caughtAt: String(r.caught_at),
    }));
  }

  /**
   * Removes all seeded/simulated demo accounts (`demo_%`, `showcase_%`, `sim_%`)
   * so the leaderboard starts empty and never mixes test bots with real TikTok viewers.
   */
  public purgeDemoPlayers(): void {
    this.db.exec(`
      DELETE FROM catches
      WHERE player_uid LIKE 'demo_%'
         OR player_uid LIKE 'showcase_%'
         OR player_uid LIKE 'sim_%';

      DELETE FROM gift_logs
      WHERE player_uid LIKE 'demo_%'
         OR player_uid LIKE 'showcase_%'
         OR player_uid LIKE 'sim_%';

      DELETE FROM players
      WHERE tiktok_uid LIKE 'demo_%'
         OR tiktok_uid LIKE 'showcase_%'
         OR tiktok_uid LIKE 'sim_%';
    `);
  }

  /**
   * Resets all fish catch rankings (BXH) to empty while preserving real players'
   * permanent Rod Levels, cumulative Diamonds (KC), Follower status, and Bait Stock.
   */
  public resetLeaderboardStats(): void {
    this.purgeDemoPlayers();
    this.db.exec(`
      DELETE FROM catches;
      UPDATE players SET
        total_weight = 0,
        total_catches = 0,
        max_fish_weight = 0,
        max_fish_name = '',
        max_fish_emoji = '🐟',
        max_fish_rarity = 'COMMON',
        rarest_fish_name = '',
        rarest_fish_emoji = '🐟',
        rarest_fish_rarity = 'COMMON',
        rarest_fish_tier_order = 0,
        rarest_fish_weight = 0,
        legendary_count = 0,
        epic_count = 0;
    `);
  }

  private mapRowToPlayer(row: Record<string, unknown>): PlayerProfile {
    const isFollower = Boolean(row.is_follower);
    const diamondsKc = Number(row.diamonds_kc || 0);
    const rodLevel = calculateRodLevelFromKc(diamondsKc, isFollower);
    const baitStock = this.parseAndCleanBaitStock(row.bait_stock_json);
    const activeBait = this.resolveActiveBaitFromStock(rodLevel, baitStock);

    return {
      tiktokUid: String(row.tiktok_uid),
      uniqueId: String(row.unique_id),
      nickname: String(row.nickname),
      avatarUrl: String(row.avatar_url),
      isFollower,
      diamondsKc,
      rodLevel,
      baitTier: activeBait.baitTier,
      baitCount: activeBait.baitCount,
      baitStock,
      pityRare: Number(row.pity_rare || 0),
      pityEpic: Number(row.pity_epic || 0),
      totalWeight: Number(row.total_weight || 0),
      totalCatches: Number(row.total_catches || 0),
      maxFishWeight: Number(row.max_fish_weight || 0),
      maxFishName: String(row.max_fish_name || ''),
      maxFishEmoji: String(row.max_fish_emoji || '🐟'),
      maxFishRarity: (String(row.max_fish_rarity) || 'COMMON') as FishRarity,
      rarestFishName: String(row.rarest_fish_name || ''),
      rarestFishEmoji: String(row.rarest_fish_emoji || '🐟'),
      rarestFishRarity: (String(row.rarest_fish_rarity) || 'COMMON') as FishRarity,
      rarestFishWeight: Number(row.rarest_fish_weight || 0),
      legendaryCount: Number(row.legendary_count || 0),
      epicCount: Number(row.epic_count || 0),
      updatedAt: String(row.updated_at || ''),
    };
  }
}
