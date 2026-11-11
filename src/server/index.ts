import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { GameDatabase } from './db.js';
import { FishingEngine } from './fishingEngine.js';
import { TikTokLiveService } from './tiktokService.js';
import {
  AudioSettings,
  DayPhase,
  SeasonId,
  ServerToClientEvents,
} from '../shared/types.js';
import { GIFT_PRESETS, ROD_TIERS } from '../shared/gameConfig.js';

const PORT = Number(process.env.PORT || 5050);

const ALLOWED_ORIGINS: Array<string | RegExp> = [
  'https://cau-ca-live.vercel.app',
  /^https:\/\/cau-ca-live(-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/.*\.vercel\.app$/i,
  /^http:\/\/(localhost|127\.0\.0\.1|lvh\.me|127\.0\.0\.1\.nip\.io)(:\d+)?$/i,
];

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.some((rule) =>
    typeof rule === 'string' ? rule === origin : rule.test(origin)
  );
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const app = express();
// Allow Chromium Private Network Access (https://cau-ca-live.vercel.app -> http://localhost:5050)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});
app.use(cors(corsOptions));
app.use(express.json());

const httpServer = http.createServer(app);

// Intercept all HTTP requests (including Socket.IO OPTIONS preflights) before engine.io runs
// so Chrome Private Network Access (https://cau-ca-live.vercel.app -> http://localhost:5050) always succeeds
const origEmit = httpServer.emit.bind(httpServer);
httpServer.emit = ((event: string, ...args: unknown[]) => {
  if (event === 'request') {
    const req = args[0] as http.IncomingMessage;
    const res = args[1] as http.ServerResponse;
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      String(
        req.headers['access-control-request-headers'] ||
          'Content-Type, Authorization, X-Requested-With'
      )
    );
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }
  }
  return origEmit(event, ...args);
}) as typeof httpServer.emit;

const io = new SocketIOServer<Record<string, never>, ServerToClientEvents>(
  httpServer,
  {
    cors: corsOptions,
    allowRequest: (_req, callback) => {
      callback(null, true);
    },
  }
);
io.engine.on('headers', (headers, req) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Allow-Private-Network'] = 'true';
});

const db = new GameDatabase();
// Xóa toàn bộ dữ liệu mẫu/giả lập để Bảng Xếp Hạng (BXH) ban đầu hoàn toàn trống
db.purgeDemoPlayers();

const engine = new FishingEngine(db, {
  onAnglerUpdated: (angler) => {
    io.emit('anglerUpdated', angler);
  },
  onAnglerLeft: (payload) => {
    io.emit('anglerLeft', payload);
  },
  onAnglerLiked: (payload) => {
    io.emit('anglerLiked', payload);
  },
  onCatchCompleted: (payload) => {
    io.emit('catchCompleted', payload);
  },
  onAlertTriggered: (alert) => {
    io.emit('alertTriggered', alert);
  },
  onLeaderboardsUpdated: (leaderboards) => {
    io.emit('leaderboardsUpdated', leaderboards);
  },
  onEnvironmentUpdated: (env) => {
    io.emit('environmentUpdated', env);
  },
});

const tiktokService = new TikTokLiveService(engine, () => {
  broadcastFullSync();
});

let audioSettings: AudioSettings = {
  bgmEnabled: true,
  sfxEnabled: true,
  ttsEnabled: true,
  bgmVolume: 0.35,
  ttsVolume: 0.9,
};

function broadcastFullSync() {
  io.emit('stateSync', {
    anglers: engine.getActiveAnglers(),
    leaderboards: db.getLeaderboards(5),
    recentCatches: db.getRecentCatches(10),
    environment: engine.getEnvironment(),
    tiktokStatus: tiktokService.getStatus(),
    audioSettings,
  });
}

// Periodically sync environment every 60 seconds so Day/Night & Daily Season transition smoothly
setInterval(() => {
  io.emit('environmentUpdated', engine.getEnvironment());
}, 60000);

io.on('connection', (socket) => {
  socket.emit('stateSync', {
    anglers: engine.getActiveAnglers(),
    leaderboards: db.getLeaderboards(5),
    recentCatches: db.getRecentCatches(10),
    environment: engine.getEnvironment(),
    tiktokStatus: tiktokService.getStatus(),
    audioSettings,
  });
});

// --- REST API FOR HOST DASHBOARD & SIMULATOR ---

app.get('/api/state', (_req, res) => {
  res.json({
    anglers: engine.getActiveAnglers(),
    leaderboards: db.getLeaderboards(5),
    recentCatches: db.getRecentCatches(10),
    environment: engine.getEnvironment(),
    tiktokStatus: tiktokService.getStatus(),
    audioSettings,
  });
});

app.post('/api/audio-settings', (req, res) => {
  const patch = req.body as Partial<AudioSettings>;
  audioSettings = {
    bgmEnabled: patch.bgmEnabled ?? audioSettings.bgmEnabled,
    sfxEnabled: patch.sfxEnabled ?? audioSettings.sfxEnabled,
    ttsEnabled: patch.ttsEnabled ?? audioSettings.ttsEnabled,
    bgmVolume:
      typeof patch.bgmVolume === 'number'
        ? Math.max(0, Math.min(1, patch.bgmVolume))
        : audioSettings.bgmVolume,
    ttsVolume:
      typeof patch.ttsVolume === 'number'
        ? Math.max(0, Math.min(1, patch.ttsVolume))
        : audioSettings.ttsVolume,
  };
  io.emit('audioSettingsUpdated', audioSettings);
  res.json({ ok: true, audioSettings });
});

app.post('/api/audio-test', (req, res) => {
  const { text } = req.body as { text?: string };
  const sampleText =
    (text || '').trim() ||
    'Chào mừng các cần thủ đến với hồ câu trực tiếp! Thả tim hoặc bình luận câu để quăng cần nhé!';
  io.emit('audioTestTriggered', { text: sampleText });
  res.json({ ok: true, text: sampleText });
});

// Proxy Vietnamese TTS Audio stream so Browser/TikTok Studio plays crystal-clear Vietnamese voice without CORS issues
app.get('/api/tts', async (req, res) => {
  const rawText = String(req.query.text || '').trim().slice(0, 180);
  if (!rawText) {
    res.status(400).json({ ok: false, error: 'Missing text' });
    return;
  }
  try {
    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      rawText
    )}&tl=vi&client=tw-ob`;
    const upstream = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });
    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  } catch (err) {
    console.error('[TTS Proxy Error]:', err);
    res.status(500).end();
  }
});

app.post('/api/environment', (req, res) => {
  const { seasonMode, season, dayPhaseForced } = req.body as {
    seasonMode?: 'daily' | 'manual';
    season?: SeasonId;
    dayPhaseForced?: DayPhase | null;
  };
  const env = engine.setEnvironmentConfig({
    seasonMode,
    season,
    dayPhaseForced,
  });
  res.json({ ok: true, environment: env });
});

app.post('/api/tiktok/connect', async (req, res) => {
  const { username } = req.body as { username?: string };
  try {
    const status = await tiktokService.connect(username || '');
    // Dọn sạch các nhân vật demo/giả lập trên bờ hồ và trên BXH để nhường 100% cho người xem TikTok Live thật
    engine.clearActiveAnglers();
    db.purgeDemoPlayers();
    broadcastFullSync();
    res.json({ ok: true, status });
  } catch (err: unknown) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Lỗi kết nối TikTok Live',
    });
  }
});

app.post('/api/leaderboard/reset', (_req, res) => {
  db.resetLeaderboardStats();
  broadcastFullSync();
  res.json({
    ok: true,
    message: 'Đã xóa làm mới toàn bộ Bảng Xếp Hạng (vẫn giữ nguyên cấp Cần & Kim Cương của người chơi)!',
  });
});

app.post('/api/tiktok/disconnect', (_req, res) => {
  tiktokService.disconnect();
  res.json({ ok: true, status: tiktokService.getStatus() });
});

const VIET_NAMES = [
  'Hoàng Long', 'Minh Thư', 'bé Na', 'Tuấn Kiệt', 'Cún Con',
  'Ngọc Anh', 'Đức Phát', 'Lan Chi', 'Tùng', 'Bảo Ngọc',
  'Gia Huy', 'Khánh Linh', 'Minh Khang', 'Thảo Vy', 'Quốc Bảo',
  'Hà My', 'Đăng Khoa', 'Phương Anh', 'Hữu Phước', 'Kiều Trang',
  'Anh Tuấn', 'Mỹ Duyên', 'Thành Đạt', 'Yến Nhi', 'Văn Hậu',
  'Thanh Trúc', 'Quang Hải', 'Bích Phương', 'Hoàng Nam', 'Kim Ngân',
  'Trọng Hiếu', 'Tuyết Nhi', 'Minh Quân', 'Hương Giang', 'Bảo Lâm',
  'Thùy Tiên', 'Đức Phúc', 'Nhã Phương', 'Tuấn Hưng', 'Linh Ka',
];

const SIM_PLAYERS = [
  ...ROD_TIERS.map((tier) => ({
    tiktokUid: `showcase_rod_lv${tier.level}`,
    uniqueId: `rod_lv_${tier.level}`,
    nickname: `${tier.name}`,
    avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=rod_lv_${tier.level}`,
  })),
  ...VIET_NAMES.map((nickname, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const uniqueId = `viewer_${num}`;
    return {
      tiktokUid: `sim_${num}`,
      uniqueId,
      nickname,
      avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${uniqueId}`,
    };
  }),
];

// 1. Simulate Like
app.post('/api/simulate/like', (req, res) => {
  const { tiktokUid, nickname, likeCount } = req.body as {
    tiktokUid?: string;
    nickname?: string;
    likeCount?: number;
  };

  const preset =
    SIM_PLAYERS.find((p) => p.tiktokUid === tiktokUid) ||
    SIM_PLAYERS[Math.floor(Math.random() * SIM_PLAYERS.length)];

  const angler = engine.handleLikeEvent({
    tiktokUid: tiktokUid || preset.tiktokUid,
    uniqueId: preset.uniqueId,
    nickname: nickname || preset.nickname,
    avatarUrl: preset.avatarUrl,
    likeCount: likeCount || 1,
  });

  res.json({ ok: true, angler });
});

// 1b. Simulate Chat Command "câu" (Cast Fishing Rod via Chat)
app.post('/api/simulate/cast-chat', (req, res) => {
  const { tiktokUid } = req.body as { tiktokUid?: string };
  const target =
    SIM_PLAYERS.find((p) => p.tiktokUid === tiktokUid) || SIM_PLAYERS[0];

  const angler = engine.handleCastChatCommand({
    tiktokUid: target.tiktokUid,
    uniqueId: target.uniqueId,
    nickname: target.nickname,
    avatarUrl: target.avatarUrl,
  });

  res.json({ ok: true, angler });
});

// 2. Simulate Follow (Unlocks Rod Lv2 Cần trúc immediately!)
app.post('/api/simulate/follow', (req, res) => {
  const { tiktokUid } = req.body as { tiktokUid?: string };
  const target =
    SIM_PLAYERS.find((p) => p.tiktokUid === tiktokUid) || SIM_PLAYERS[0];

  const result = engine.handleFollowEvent({
    tiktokUid: target.tiktokUid,
    uniqueId: target.uniqueId,
    nickname: target.nickname,
    avatarUrl: target.avatarUrl,
  });

  res.json({ ok: true, ...result });
});

// 3. Simulate Chat Command "cần" (Check Rod Level, KC & Active Bait)
app.post('/api/simulate/rod-check', (req, res) => {
  const { tiktokUid } = req.body as { tiktokUid?: string };
  const target =
    SIM_PLAYERS.find((p) => p.tiktokUid === tiktokUid) || SIM_PLAYERS[0];

  const result = engine.handleRodCheckCommand({
    tiktokUid: target.tiktokUid,
    uniqueId: target.uniqueId,
    nickname: target.nickname,
    avatarUrl: target.avatarUrl,
  });

  res.json({ ok: true, ...result });
});

// 4. Simulate SPAM LIKES
app.post('/api/simulate/spam-likes', (req, res) => {
  const { tiktokUid, bursts = 15 } = req.body as {
    tiktokUid?: string;
    bursts?: number;
  };

  const target =
    SIM_PLAYERS.find((p) => p.tiktokUid === tiktokUid) || SIM_PLAYERS[0];

  let count = 0;
  const interval = setInterval(() => {
    count++;
    engine.handleLikeEvent({
      tiktokUid: target.tiktokUid,
      uniqueId: target.uniqueId,
      nickname: target.nickname,
      avatarUrl: target.avatarUrl,
      likeCount: Math.floor(Math.random() * 10) + 1,
    });
    if (count >= bursts) {
      clearInterval(interval);
    }
  }, 120);

  res.json({
    ok: true,
    message: `Đang giả lập ${bursts} đợt spam tim liên tiếp từ ${target.nickname} (Kiểm tra chống lỗi & hàng đợi max 3 lượt)`,
  });
});

// 5. Simulate Crowd Wave (9 or 40 viewers)
app.post('/api/simulate/crowd', (req, res) => {
  const { count = 9 } = (req.body || {}) as { count?: number };
  const subset = SIM_PLAYERS.slice(0, Math.min(SIM_PLAYERS.length, count));

  subset.forEach((p, idx) => {
    setTimeout(() => {
      engine.handleLikeEvent({
        tiktokUid: p.tiktokUid,
        uniqueId: p.uniqueId,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        likeCount: 2,
      });
    }, idx * 75);
  });

  res.json({ ok: true, count: subset.length });
});

// 6. Simulate Gift / Donate Upgrade
app.post('/api/simulate/gift', (req, res) => {
  const { tiktokUid, giftId, repeatCount, diamonds } = req.body as {
    tiktokUid?: string;
    giftId?: string;
    repeatCount?: number;
    diamonds?: number;
  };

  const target =
    SIM_PLAYERS.find((p) => p.tiktokUid === tiktokUid) ||
    SIM_PLAYERS[Math.floor(Math.random() * SIM_PLAYERS.length)];

  const preset =
    GIFT_PRESETS.find((g) => g.id === giftId) || GIFT_PRESETS[0];

  const result = engine.handleGiftEvent({
    tiktokUid: target.tiktokUid,
    uniqueId: target.uniqueId,
    nickname: target.nickname,
    avatarUrl: target.avatarUrl,
    giftId: preset.id,
    giftName: preset.name,
    diamonds: diamonds ?? preset.diamonds,
    repeatCount: repeatCount || 1,
  });

  res.json({ ok: true, ...result });
});

// 7. Spawn 10 Anglers at the Bottom of the Map showcasing all 10 Rod Levels (Lv1 -> Lv10)
function spawnBottom10RodShowcase() {
  engine.clearActiveAnglers();

  ROD_TIERS.forEach((tier, idx) => {
    const uid = `showcase_rod_lv${tier.level}`;
    const uniqueId = `rod_lv_${tier.level}`;
    const nickname = `${tier.name}`;
    const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${uniqueId}`;

    // Ensure exact cumulative KC for this rod level in DB
    const existing = db.getOrCreatePlayer({
      tiktokUid: uid,
      uniqueId,
      nickname,
      avatarUrl,
    });
    const deltaKc = Math.max(0, tier.requiredKc - existing.diamondsKc);
    if (deltaKc > 0) {
      db.applyGiftUpgrade({
        tiktokUid: uid,
        uniqueId,
        nickname,
        avatarUrl,
        giftId: 'showcase_kc',
        giftName: `Mở khóa ${tier.name}`,
        diamonds: deltaKc,
      });
    }

    // Spawn into slot idx (0..9 at the bottom of the map!) and queue 3 casts
    engine.handleLikeEvent({
      tiktokUid: uid,
      uniqueId,
      nickname,
      avatarUrl,
      likeCount: 3,
      isFollower: idx === 1, // Lv2 showcase also has follower flag
    });
  });

  broadcastFullSync();
}

app.post('/api/simulate/rod-showcase', (_req, res) => {
  spawnBottom10RodShowcase();
  res.json({
    ok: true,
    message: 'Đã xếp 10 Cần Thủ (Lv1 ➔ Lv10) dọc vòng cung đáy hồ!',
  });
});

// Serve static production frontend build (dist) if present so both FE & BE run on a single URL
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`🎣 [Fishing Live Server] Running at http://localhost:${PORT} (TikTok Studio Link: http://lvh.me:${PORT}/?studio=1)`);
});
