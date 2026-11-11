import React, { useState } from 'react';
import { DayPhase, EnvironmentState, SeasonId } from '../../shared/types.js';
import {
  GIFT_PRESETS,
  getBaitConfigByTier,
  ROD_TIERS,
  SEASON_META,
} from '../../shared/gameConfig.js';
import { getBackendBaseUrl } from '../apiConfig.js';
import {
  Radio,
  Heart,
  Zap,
  Users,
  Gift,
  Smartphone,
  Monitor,
  Settings,
  X,
  UserPlus,
  MessageSquare,
  Sun,
  Moon,
} from 'lucide-react';

interface HostSimulatorDrawerProps {
  tiktokStatus: {
    connected: boolean;
    username: string;
    roomId?: string;
    error?: string;
  };
  environment: EnvironmentState;
  aspectMode: '9:16' | '16:9';
  onToggleAspectMode: (mode: '9:16' | '16:9') => void;
  customAnnouncement: string;
  onChangeAnnouncement: (text: string) => void;
}

const DEMO_VIEWERS = [
  { uid: 'showcase_rod_lv1', name: 'Lv1 – Cần tre (Đáy Trái 1)' },
  { uid: 'showcase_rod_lv2', name: 'Lv2 – Cần trúc đen (Đáy Trái 2)' },
  { uid: 'showcase_rod_lv3', name: 'Lv3 – Cần composite (Đáy Trái 3)' },
  { uid: 'showcase_rod_lv4', name: 'Lv4 – Cần sợi thủy tinh (Đáy Trái 4)' },
  { uid: 'showcase_rod_lv5', name: 'Lv5 – Cần carbon (Đáy Giữa Trái)' },
  { uid: 'showcase_rod_lv6', name: 'Lv6 – Cần carbon Pro (Đáy Giữa Phải)' },
  { uid: 'showcase_rod_lv7', name: 'Lv7 – Cần titan (Đáy Phải 4)' },
  { uid: 'showcase_rod_lv8', name: 'Lv8 – Cần hợp kim bạc (Đáy Phải 3)' },
  { uid: 'showcase_rod_lv9', name: 'Lv9 – Cần vàng (Đáy Phải 2)' },
  { uid: 'showcase_rod_lv10', name: 'Lv10 – Cần Thần Ngư (Đáy Phải 1)' },
  { uid: 'sim_01', name: 'Hoàng Long (Viewer 01)' },
  { uid: 'sim_02', name: 'Minh Thư (Viewer 02)' },
];

const SEASONS_LIST: SeasonId[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

const API_BASE = getBackendBaseUrl();

export const HostSimulatorDrawer: React.FC<HostSimulatorDrawerProps> = ({
  tiktokStatus,
  environment,
  aspectMode,
  onToggleAspectMode,
  customAnnouncement,
  onChangeAnnouncement,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [usernameInput, setUsernameInput] = useState(
    tiktokStatus.username || ''
  );
  const [selectedViewer, setSelectedViewer] = useState(DEMO_VIEWERS[0].uid);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3200);
  };

  const handleConnectTikTok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setLoadingConnect(true);
    try {
      const res = await fetch(`${API_BASE}/api/tiktok/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(`⚠️ ${data.error}`);
      } else {
        showToast(`✅ Đã kết nối phòng Live của @${data.status.username}!`);
      }
    } catch {
      showToast('⚠️ Lỗi kết nối tới Server');
    } finally {
      setLoadingConnect(false);
    }
  };

  const handleDisconnectTikTok = async () => {
    await fetch(`${API_BASE}/api/tiktok/disconnect`, { method: 'POST' });
    showToast('Đã ngắt kết nối TikTok Live');
  };

  const handleResetLeaderboard = async () => {
    const res = await fetch(`${API_BASE}/api/leaderboard/reset`, {
      method: 'POST',
    });
    const data = await res.json();
    showToast(data.message || '🗑️ Đã làm trống Bảng Xếp Hạng!');
  };

  const updateEnvironment = async (payload: {
    seasonMode?: 'daily' | 'manual';
    season?: SeasonId;
    dayPhaseForced?: DayPhase | null;
  }) => {
    await fetch(`${API_BASE}/api/environment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  const triggerLike = async () => {
    await fetch(`${API_BASE}/api/simulate/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktokUid: selectedViewer, likeCount: 1 }),
    });
  };

  const triggerCastChat = async () => {
    await fetch(`${API_BASE}/api/simulate/cast-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktokUid: selectedViewer }),
    });
    showToast('💬 Đã giả lập Chat "câu" ➔ Quăng cần câu cá!');
  };

  const triggerFollow = async () => {
    await fetch(`${API_BASE}/api/simulate/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktokUid: selectedViewer }),
    });
    showToast('💚 Đã giả lập Follow kênh ➔ Mở khóa Cần Trúc Lv2!');
  };

  const triggerRodCheck = async () => {
    await fetch(`${API_BASE}/api/simulate/rod-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktokUid: selectedViewer }),
    });
  };

  const triggerSpamLikes = async () => {
    const res = await fetch(`${API_BASE}/api/simulate/spam-likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktokUid: selectedViewer, bursts: 18 }),
    });
    const data = await res.json();
    if (data.message) showToast(data.message);
  };

  const triggerCrowdWave = async (count = 9) => {
    await fetch(`${API_BASE}/api/simulate/crowd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    showToast(`🌊 Đã gọi ${count} Viewer cùng thả tim quăng câu!`);
  };

  const triggerRodShowcase = async () => {
    const res = await fetch(`${API_BASE}/api/simulate/rod-showcase`, {
      method: 'POST',
    });
    const data = await res.json();
    showToast(
      data.message || '🎣 Đã xếp 10 Cần Thủ (Lv1 ➔ Lv10) dọc vòng cung đáy hồ!'
    );
  };

  const triggerGift = async (giftId: string) => {
    await fetch(`${API_BASE}/api/simulate/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tiktokUid: selectedViewer,
        giftId,
        repeatCount: 1,
      }),
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/50 text-cyan-300 text-xs font-bold shadow-2xl backdrop-blur-md transition-all cursor-pointer"
        title="Mở Bảng Điều Khiển Streamer & Giả Lập"
      >
        <Settings className="w-4 h-4 animate-spin" />
        <span>Bảng Điều Khiển & Test Live</span>
      </button>
    );
  }

  return (
    <div className="fixed right-3 top-3 bottom-3 w-80 sm:w-96 z-50 bg-slate-950/95 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-y-auto text-xs text-slate-200">
      <div className="space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Radio
              className={`w-4 h-4 ${
                tiktokStatus.connected
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-cyan-400'
              }`}
            />
            <div>
              <h2 className="font-black text-sm text-white">
                🎛️ Host Control & Simulator (v1)
              </h2>
              <p className="text-[10px] text-slate-400">
                10 Cấp Cần KC • 6 Mồi • 22 Loài Cá Ngày/Đêm & 4 Mùa
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Thu gọn để quay OBS sạch màn hình"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-2 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 font-semibold text-[11px]">
            {feedbackMsg}
          </div>
        )}

        {/* 1. Aspect Ratio Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
          <div className="font-bold text-slate-300 mb-1.5 flex items-center justify-between text-[11px]">
            <span>📐 Khung hình phát Live (OBS):</span>
            <span className="text-[10px] text-cyan-400 font-extrabold">
              {aspectMode}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onToggleAspectMode('9:16')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                aspectMode === '9:16'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Dọc 9:16 (TikTok)</span>
            </button>
            <button
              onClick={() => onToggleAspectMode('16:9')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                aspectMode === '16:9'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Ngang 16:9 (Full)</span>
            </button>
          </div>
        </div>

        {/* 2. Day/Night & 4-Season Environment Controller (Section 7) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-300">
              🌸 Môi Trường Ngày/Đêm & 4 Mùa:
            </span>
            <span className="text-[10px] text-slate-400">
              Giờ VN: {environment.vietnamTimeStr}
            </span>
          </div>

          {/* Day / Night Selector */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <button
              onClick={() => updateEnvironment({ dayPhaseForced: null })}
              className={`py-1 rounded-lg font-bold border cursor-pointer ${
                !environment.dayPhaseForced
                  ? 'bg-teal-500 text-slate-950 border-teal-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              Tự động ({environment.dayPhase === 'DAY' ? 'Ngày' : 'Đêm'})
            </button>
            <button
              onClick={() => updateEnvironment({ dayPhaseForced: 'DAY' })}
              className={`py-1 rounded-lg font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                environment.dayPhaseForced === 'DAY'
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span>Ban Ngày</span>
            </button>
            <button
              onClick={() => updateEnvironment({ dayPhaseForced: 'NIGHT' })}
              className={`py-1 rounded-lg font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                environment.dayPhaseForced === 'NIGHT'
                  ? 'bg-indigo-500 text-white border-indigo-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>Ban Đêm</span>
            </button>
          </div>

          {/* Season Mode & 4 Seasons Selector */}
          <div className="flex items-center justify-between text-[10px] pt-1">
            <span className="text-slate-300 font-semibold">Chế độ Mùa:</span>
            <button
              onClick={() =>
                updateEnvironment({
                  seasonMode:
                    environment.seasonMode === 'daily' ? 'manual' : 'daily',
                })
              }
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-700 cursor-pointer"
            >
              {environment.seasonMode === 'daily'
                ? '🔄 Tự xoay mỗi ngày (Daily)'
                : '✋ Đang khóa mùa thủ công'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            {SEASONS_LIST.map((s) => {
              const meta = SEASON_META[s];
              const isActive = environment.season === s;
              return (
                <button
                  key={s}
                  onClick={() =>
                    updateEnvironment({ seasonMode: 'manual', season: s })
                  }
                  className={`py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400/20 border-amber-300 text-amber-200 scale-105'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                  title={`Cá độc quyền: ${meta.signatureFish}`}
                >
                  {meta.emoji} {meta.name.replace('Mùa ', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. TikTok Live Connection */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-white">
              📡 Kết nối TikTok Live thật:
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                tiktokStatus.connected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tiktokStatus.connected
                ? `LIVE: @${tiktokStatus.username}`
                : 'Chế độ Giả Lập'}
            </span>
          </div>

          <form onSubmit={handleConnectTikTok} className="flex gap-1.5">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Nhập @username đang Live..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            {tiktokStatus.connected ? (
              <button
                type="button"
                onClick={handleDisconnectTikTok}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 cursor-pointer"
              >
                Ngắt
              </button>
            ) : (
              <button
                type="submit"
                disabled={loadingConnect}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {loadingConnect ? '...' : 'Kết nối'}
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={handleResetLeaderboard}
            className="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-[10.5px] transition-colors cursor-pointer"
            title="Xóa trống Bảng Xếp Hạng để bắt đầu giải đấu/phiên mới (Vẫn giữ nguyên Cấp Cần & Kim Cương của người xem)"
          >
            🗑️ Làm trống Bảng Xếp Hạng (Giữ cấp Cần)
          </button>
        </div>

        {/* 4. Custom Live Guide / Pin Text */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1">
          <label className="block font-bold text-amber-300 text-[11px]">
            📢 Dòng thông báo ghim trên Banner Hướng Dẫn:
          </label>
          <input
            type="text"
            value={customAnnouncement}
            onChange={(e) => onChangeAnnouncement(e.target.value)}
            placeholder="VD: Đua Top 1 tối nay nhận thưởng! Follow lên Cần Lv2..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-[11px]"
          />
        </div>

        {/* 5. Interactive Simulator (Like, Follow -> Lv2, Chat "cần", Gifts) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2.5">
          <div>
            <label className="block font-bold text-white mb-1 text-[11px]">
              👤 Chọn Viewer giả lập để thao tác:
            </label>
            <select
              value={selectedViewer}
              onChange={(e) => setSelectedViewer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-cyan-400"
            >
              {DEMO_VIEWERS.map((v) => (
                <option key={v.uid} value={v.uid}>
                  {v.name} ({v.uid})
                </option>
              ))}
            </select>
          </div>

          {/* Like / Chat "câu" -> Cast, Follow -> Lv2, Chat "cần", Crowd */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={triggerLike}
                className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold shadow transition-transform active:scale-95 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Thả Tim (Câu)</span>
              </button>

              <button
                onClick={triggerCastChat}
                className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold shadow transition-transform active:scale-95 cursor-pointer"
                title="Giả lập người xem bình luận 'câu' để ra hồ quăng cần câu cá!"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat "câu" (Câu)</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={triggerFollow}
                className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow transition-transform active:scale-95 cursor-pointer text-[10.5px]"
                title="Giả lập sự kiện Follow kênh -> Lên ngay Cần Trúc Lv2 vĩnh viễn!"
              >
                <UserPlus className="w-3 h-3 shrink-0" />
                <span>Follow (Lv2)</span>
              </button>

              <button
                onClick={triggerRodCheck}
                className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold shadow transition-transform active:scale-95 cursor-pointer text-[10.5px]"
                title="Giả lập người xem gõ lệnh chat 'cần' để kiểm tra Cấp Cần, KC tích lũy & Mồi"
              >
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span>Chat "cần"</span>
              </button>

              <button
                onClick={triggerSpamLikes}
                className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow transition-transform active:scale-95 cursor-pointer text-[10.5px]"
              >
                <Zap className="w-3 h-3 fill-current shrink-0" />
                <span>Spam Tim</span>
              </button>
            </div>

            <button
              onClick={triggerRodShowcase}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black shadow-lg transition-transform active:scale-95 text-[11.5px] cursor-pointer"
              title="Xếp ngay 10 Cần Thủ từ Lv1 đến Lv10 dọc vòng cung dưới đáy hồ để xem sự thay đổi của 10 cấp cần câu!"
            >
              <span>🎣 Xếp 10 Cấp Cần Đáy Hồ (Lv1 ➔ Lv10)</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => triggerCrowdWave(9)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow transition-transform active:scale-95 text-[11px] cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>🌊 Gọi 9 Viewer</span>
              </button>

              <button
                onClick={() => triggerCrowdWave(40)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-extrabold shadow transition-transform active:scale-95 text-[11px] cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>🔥 Test 40 User!</span>
              </button>
            </div>
          </div>

          {/* Gift / Donate Upgrade Buttons (6 Baits + Cumulative KC) */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              <span>Tặng Quà (+KC Lên Cần Vĩnh Viễn + Gói Mồi):</span>
            </div>

            <div className="space-y-1">
              {GIFT_PRESETS.map((g) => {
                const baitCfg = getBaitConfigByTier(g.baitTierGranted);
                return (
                  <button
                    key={g.id}
                    onClick={() => triggerGift(g.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={baitCfg.imageUrl}
                        alt={baitCfg.name}
                        className="w-6 h-5 object-contain shrink-0 group-hover:scale-125 transition-transform"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-white text-[10.5px] truncate">
                          {g.emoji} {g.name}
                        </div>
                        <div className="text-[8.5px] text-slate-400 truncate">
                          {g.description}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-[9.5px] shrink-0">
                      +{g.diamonds} KC
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. 10 Rod Levels Reference (Mục 4) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
          <div className="font-bold text-slate-300 mb-1.5 text-[11px]">
            🎣 10 Cấp Cần Câu Tích Lũy KC (Lưu Vĩnh Viễn):
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ROD_TIERS.map((r) => (
              <div
                key={r.level}
                className="flex items-center justify-between text-[9px] px-1.5 py-1 rounded bg-slate-950/80 border border-white/5"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <img
                    src={r.rodSpriteUrl}
                    alt={r.name}
                    className="w-2.5 h-5 object-contain shrink-0"
                  />
                  <span style={{ color: r.color }} className="font-extrabold truncate">
                    Lv{r.level} {r.name}
                  </span>
                </div>
                <span className="text-slate-400 shrink-0 ml-1">
                  {r.level === 2 ? '10KC/Flw' : `${r.requiredKc}KC`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 text-[9.5px] text-slate-500 text-center">
        Đóng bảng này (nút X góc phải) khi quay màn hình OBS để giao diện Live sạch 100%.
      </div>
    </div>
  );
};
