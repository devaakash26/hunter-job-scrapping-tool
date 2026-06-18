export const AUTH = {
  USERNAME: process.env.AUTH_USERNAME || 'admin26',
  PASSWORD: process.env.AUTH_PASSWORD || 'Success2026',
  COOKIE_NAME: 'jh_auth',
  COOKIE_VALUE: '1',
  COOKIE_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
  LOGIN_PATH: '/login',
  LOGOUT_PATH: '/logout',
} as const;
