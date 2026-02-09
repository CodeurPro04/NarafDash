import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance = null;

const normalizeApiBase = (rawUrl) => {
  if (!rawUrl) return '';
  const trimmed = rawUrl.replace(/\/+$/, '');
  return trimmed
    .replace(/\/api\/v1$/i, '')
    .replace(/\/api$/i, '');
};

const buildEcho = (token) => {
  const rawBaseUrl = import.meta.env.VITE_API_URL || 'https://api.kovatech.digital';
  const apiBaseUrl = normalizeApiBase(rawBaseUrl);
  const authEndpoint = `${apiBaseUrl}/api/v1/broadcasting/auth`;
  const key = import.meta.env.VITE_PUSHER_APP_KEY;
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1';
  const host = import.meta.env.VITE_PUSHER_HOST || undefined;
  const wsPort = Number(import.meta.env.VITE_PUSHER_PORT || 443);
  const scheme = import.meta.env.VITE_PUSHER_SCHEME || 'https';
  const forceTLS = scheme === 'https';

  if (!key) {
    return null;
  }

  window.Pusher = Pusher;

  return new Echo({
    broadcaster: 'pusher',
    key,
    cluster,
    wsHost: host,
    wsPort,
    wssPort: wsPort,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint,
    auth: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
};

export const getEcho = (token) => {
  if (!echoInstance) {
    echoInstance = buildEcho(token);
  } else if (token && echoInstance) {
    const authHeaders = echoInstance.connector?.pusher?.config?.auth?.headers;
    if (authHeaders) {
      authHeaders.Authorization = `Bearer ${token}`;
    }
  }

  return echoInstance;
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
