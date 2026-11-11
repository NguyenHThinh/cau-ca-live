import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ActiveAnglerState,
  AudioSettings,
  CatchResult,
  EnvironmentState,
  LeaderboardBundle,
  LiveEventAlert,
  ServerToClientEvents,
} from '../shared/types.js';
import { FishingScene2D } from './components/FishingScene2D.js';
import { RotatingLeaderboard } from './components/RotatingLeaderboard.js';
import { AlertOverlay } from './components/AlertOverlay.js';
import { LiveGuideBanner } from './components/LiveGuideBanner.js';
import { HostSimulatorDrawer } from './components/HostSimulatorDrawer.js';
import { getBackendBaseUrl } from './apiConfig.js';
import { soundManager } from './utils/soundManager.js';

const STUDIO_BASE_WIDTH = 450;
const STUDIO_BASE_HEIGHT = 800;

export const App: React.FC = () => {
  const [anglers, setAnglers] = useState<ActiveAnglerState[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardBundle>({
    biggestCatch: [],
    bestTierCatch: [],
    epicLegendHunter: [],
  });
  const [recentCatches, setRecentCatches] = useState<CatchResult[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    dayPhase: 'DAY',
    dayPhaseForced: null,
    season: 'SPRING',
    seasonMode: 'daily',
    seasonExpiresAt: null,
    waitMod: 0.95,
    tierMod: [1, 1.15, 1.15, 1, 1],
    vietnamTimeStr: '12:00',
  });
  const [tiktokStatus, setTiktokStatus] = useState<{
    connected: boolean;
    username: string;
    roomId?: string;
    error?: string;
  }>({
    connected: false,
    username: '',
  });
  const [activeAlert, setActiveAlert] = useState<LiveEventAlert | null>(null);
  const [heartBursts, setHeartBursts] = useState<Record<string, number>>({});
  const [aspectMode, setAspectMode] = useState<'9:16' | '16:9'>('9:16');
  const [customAnnouncement, setCustomAnnouncement] = useState<string>('');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    bgmEnabled: true,
    sfxEnabled: true,
    ttsEnabled: true,
    bgmVolume: 0.35,
    ttsVolume: 0.9,
  });
  const [isStudioMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('studio') === '1' || params.get('clean') === '1';
  });
  const [studioScale, setStudioScale] = useState<{ x: number; y: number }>({
    x: 1,
    y: 1,
  });

  useEffect(() => {
    if (!isStudioMode || typeof window === 'undefined') return;
    const updateStudioScale = () => {
      const vw = window.innerWidth || STUDIO_BASE_WIDTH;
      const vh = window.innerHeight || STUDIO_BASE_HEIGHT;
      const ratio = vw / vh;
      // Inside vertical broadcast canvas (e.g. 1080x1920, 720x1280, 540x960), fill 100% edge-to-edge
      if (ratio <= 0.75) {
        setStudioScale({
          x: vw / STUDIO_BASE_WIDTH,
          y: vh / STUDIO_BASE_HEIGHT,
        });
      } else {
        // On wide desktop monitor preview, scale uniformly keeping 9:16 proportion
        const s = Math.min(vw / STUDIO_BASE_WIDTH, vh / STUDIO_BASE_HEIGHT);
        setStudioScale({ x: s, y: s });
      }
    };
    updateStudioScale();
    window.addEventListener('resize', updateStudioScale);
    return () => window.removeEventListener('resize', updateStudioScale);
  }, [isStudioMode]);

  useEffect(() => {
    const backendUrl = getBackendBaseUrl() || undefined;
    const socket: Socket<ServerToClientEvents> = io(backendUrl);

    socket.on('stateSync', (payload) => {
      setAnglers(payload.anglers);
      setLeaderboards(payload.leaderboards);
      setRecentCatches(payload.recentCatches);
      setEnvironment(payload.environment);
      setTiktokStatus(payload.tiktokStatus);
      if (payload.audioSettings) {
        setAudioSettings(payload.audioSettings);
        soundManager.updateSettings(payload.audioSettings);
      }
    });

    socket.on('anglerUpdated', (updatedAngler) => {
      if (updatedAngler.status === 'CASTING') {
        soundManager.playCastSplash();
      }
      setAnglers((prev) => {
        const exists = prev.some((a) => a.tiktokUid === updatedAngler.tiktokUid);
        const next = exists
          ? prev.map((a) =>
              a.tiktokUid === updatedAngler.tiktokUid ? updatedAngler : a
            )
          : [...prev, updatedAngler];
        return next.sort((a, b) => a.slotIndex - b.slotIndex);
      });
    });

    socket.on('anglerLeft', ({ tiktokUid }) => {
      setAnglers((prev) => prev.filter((a) => a.tiktokUid !== tiktokUid));
      setHeartBursts((prev) => {
        if (!(tiktokUid in prev)) return prev;
        const copy = { ...prev };
        delete copy[tiktokUid];
        return copy;
      });
    });

    socket.on('anglerLiked', (payload) => {
      setHeartBursts((prev) => ({
        ...prev,
        [payload.tiktokUid]: Date.now(),
      }));
    });

    socket.on('catchCompleted', ({ angler, catchResult, leaderboards: lb }) => {
      soundManager.playCatchChime(catchResult.rarity);
      setAnglers((prev) => {
        const exists = prev.some((a) => a.tiktokUid === angler.tiktokUid);
        const next = exists
          ? prev.map((a) => (a.tiktokUid === angler.tiktokUid ? angler : a))
          : [...prev, angler];
        return next.sort((a, b) => a.slotIndex - b.slotIndex);
      });
      setLeaderboards(lb);
      setRecentCatches((prev) => [catchResult, ...prev.slice(0, 14)]);
    });

    socket.on('alertTriggered', (alert) => {
      setActiveAlert(alert);
      if (alert.speechText) {
        soundManager.speakAnnouncement(alert.speechText);
      }
    });

    socket.on('leaderboardsUpdated', (lb) => {
      setLeaderboards(lb);
    });

    socket.on('environmentUpdated', (env) => {
      setEnvironment(env);
    });

    socket.on('audioSettingsUpdated', (nextSettings) => {
      setAudioSettings(nextSettings);
      soundManager.updateSettings(nextSettings);
    });

    socket.on('audioTestTriggered', ({ text }) => {
      soundManager.speakAnnouncement(text);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
      {/* Main Live Stream Stage Container (Auto-scaled 450x800 -> 1080x1920 in ?studio=1 mode, or 9:16 / 16:9 in Host mode) */}
      <div
        style={
          isStudioMode
            ? {
                width: `${STUDIO_BASE_WIDTH}px`,
                height: `${STUDIO_BASE_HEIGHT}px`,
                transform: `scale(${studioScale.x}, ${studioScale.y})`,
                transformOrigin: 'center center',
              }
            : undefined
        }
        className={`relative overflow-hidden transition-all duration-300 ${
          isStudioMode
            ? 'shrink-0 border-0'
            : aspectMode === '9:16'
            ? 'h-full w-full max-w-[500px] aspect-[9/16] shadow-[0_0_80px_rgba(0,0,0,0.9)] border-x border-slate-800/80'
            : 'h-full w-full max-w-full shadow-[0_0_80px_rgba(0,0,0,0.9)]'
        }`}
      >
        {/* 2D Pond Background + 40 Anglers in Lower 2/3 */}
        <FishingScene2D
          anglers={anglers}
          heartBursts={heartBursts}
          environment={environment}
        />

        {/* TOP 1/3 HUD ZONE: Left = 2-Line Leaderboard | Right = Bullet-List Guide Banner */}
        <div className="absolute top-3 inset-x-2.5 z-40 flex items-stretch justify-between gap-2 pointer-events-none">
          <RotatingLeaderboard
            leaderboards={leaderboards}
            rotationIntervalMs={30000}
          />

          <LiveGuideBanner customAnnouncement={customAnnouncement} />
        </div>

        {/* BOTTOM-RIGHT HORIZONTAL SEASON/TIME BAR + CENTER ALERT OVERLAY */}
        <AlertOverlay
          activeAlert={activeAlert}
          recentCatches={recentCatches}
          environment={environment}
        />
      </div>

      {/* Host Control & Simulator Drawer (Hidden in ?studio=1 clean broadcast mode) */}
      {!isStudioMode && (
        <HostSimulatorDrawer
          tiktokStatus={tiktokStatus}
          environment={environment}
          aspectMode={aspectMode}
          onToggleAspectMode={setAspectMode}
          customAnnouncement={customAnnouncement}
          onChangeAnnouncement={setCustomAnnouncement}
          audioSettings={audioSettings}
        />
      )}
    </div>
  );
};
