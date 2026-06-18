export const PLATFORMS = {
  WELLFOUND: 'wellfound',
  CUTSHORT: 'cutshort',
  INSTAHYRE: 'instahyre',
  LINKEDIN: 'linkedin',
  YC: 'yc',
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

export const PLATFORM_URLS = {
  [PLATFORMS.WELLFOUND]: 'https://wellfound.com/jobs?roles[]=full-stack-engineer&remote=true',
  [PLATFORMS.CUTSHORT]: 'https://cutshort.io/jobs',
  [PLATFORMS.INSTAHYRE]: 'https://www.instahyre.com/search-jobs/',
  [PLATFORMS.LINKEDIN]: 'https://www.linkedin.com/jobs/search/?keywords=SDE+full+stack&location=India&f_E=1%2C2&f_WT=2',
  [PLATFORMS.YC]: 'https://www.workatastartup.com/jobs?role=eng&subRole=full-stack&yoe_min=0&yoe_max=2&remote=true',
} as const;

export const PLATFORM_COOKIE_PATHS = {
  [PLATFORMS.WELLFOUND]: 'cookies/wellfound.json',
  [PLATFORMS.CUTSHORT]: 'cookies/cutshort.json',
  [PLATFORMS.LINKEDIN]: 'cookies/linkedin.json',
} as const;

export const PLATFORM_LOGIN_URLS = {
  [PLATFORMS.WELLFOUND]: 'https://wellfound.com/login',
  [PLATFORMS.CUTSHORT]: 'https://cutshort.io/login',
  [PLATFORMS.LINKEDIN]: 'https://www.linkedin.com/login',
} as const;
