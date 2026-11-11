/**
 * Resolves the Backend API & Socket.IO base URL:
 * 1. If VITE_BACKEND_URL is explicitly configured (e.g. Cloud 24/7 Backend), use it.
 * 2. If running on local dev/prod server (localhost, 127.0.0.1, lvh.me, nip.io), use relative origin ('').
 * 3. If opened from a remote HTTPS static host like Vercel (*.vercel.app) inside TikTok LIVE Studio,
 *    automatically connect directly to the streamer's local backend at http://localhost:5050 (0ms loopback latency).
 */
export function getBackendBaseUrl(): string {
  const envUrl = (
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_BACKEND_URL || ''
  )
    .trim()
    .replace(/\/$/, '');

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'lvh.me' ||
      host.endsWith('.lvh.me') ||
      host.endsWith('.nip.io');

    if (!isLocalHost) {
      return 'http://localhost:5050';
    }
  }

  return '';
}
