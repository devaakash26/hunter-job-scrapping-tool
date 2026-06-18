export const PLATFORMS = {
  // Job boards
  WELLFOUND: 'wellfound',
  CUTSHORT: 'cutshort',
  INSTAHYRE: 'instahyre',
  LINKEDIN: 'linkedin',
  YC: 'yc',
  // Big 4 + MNCs
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
  AMAZON: 'amazon',
  ORACLE: 'oracle',
  // Indian startups
  SWIGGY: 'swiggy',
  RAZORPAY: 'razorpay',
  ZEPTO: 'zepto',
  MEESHO: 'meesho',
  GROWW: 'groww',
  CRED: 'cred',
  ZOMATO: 'zomato',
  BLINKIT: 'blinkit',
  PHONEPE: 'phonepe',
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

export const PLATFORM_URLS = {
  [PLATFORMS.WELLFOUND]: 'https://wellfound.com/jobs?roles[]=full-stack-engineer&remote=true',
  [PLATFORMS.CUTSHORT]: 'https://cutshort.io/jobs',
  [PLATFORMS.INSTAHYRE]: 'https://www.instahyre.com/search-jobs/',
  [PLATFORMS.LINKEDIN]: 'https://www.linkedin.com/jobs/search/?keywords=SDE+full+stack&location=India&f_E=1%2C2&f_WT=2',
  [PLATFORMS.YC]: 'https://www.workatastartup.com/jobs?role=eng&subRole=full-stack&yoe_min=0&yoe_max=2&remote=true',
  [PLATFORMS.GOOGLE]: 'https://careers.google.com/jobs/results/?q=software+engineer&location=India',
  [PLATFORMS.MICROSOFT]: 'https://jobs.careers.microsoft.com/global/en/search?q=software+engineer+india&l=en_us',
  [PLATFORMS.AMAZON]: 'https://www.amazon.jobs/en/search?base_query=software+development+engineer&loc_query=India',
  [PLATFORMS.ORACLE]: 'https://careers.oracle.com/jobs/#en/sites/jobsearch/jobs?keyword=software+engineer&location=India',
  [PLATFORMS.SWIGGY]: 'https://careers.swiggy.com/',
  [PLATFORMS.RAZORPAY]: 'https://razorpay.com/jobs/',
  [PLATFORMS.ZEPTO]: 'https://jobs.lever.co/zepto',
  [PLATFORMS.MEESHO]: 'https://meesho.io/careers',
  [PLATFORMS.GROWW]: 'https://groww.in/careers',
  [PLATFORMS.CRED]: 'https://careers.cred.club/',
  [PLATFORMS.ZOMATO]: 'https://www.zomato.com/careers',
  [PLATFORMS.BLINKIT]: 'https://blinkit.com/careers',
  [PLATFORMS.PHONEPE]: 'https://www.phonepe.com/careers/',
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

// Source badge colors for UI
export const PLATFORM_COLORS: Record<string, string> = {
  [PLATFORMS.WELLFOUND]: '#f97316',
  [PLATFORMS.CUTSHORT]: '#8b5cf6',
  [PLATFORMS.INSTAHYRE]: '#06b6d4',
  [PLATFORMS.LINKEDIN]: '#0077b5',
  [PLATFORMS.YC]: '#f97316',
  [PLATFORMS.GOOGLE]: '#4285f4',
  [PLATFORMS.MICROSOFT]: '#00a4ef',
  [PLATFORMS.AMAZON]: '#ff9900',
  [PLATFORMS.ORACLE]: '#c74634',
  [PLATFORMS.SWIGGY]: '#fc8019',
  [PLATFORMS.RAZORPAY]: '#2d81f7',
  [PLATFORMS.ZEPTO]: '#7c3aed',
  [PLATFORMS.MEESHO]: '#f43f5e',
  [PLATFORMS.GROWW]: '#00d09c',
  [PLATFORMS.CRED]: '#1a1a2e',
  [PLATFORMS.ZOMATO]: '#e23744',
  [PLATFORMS.BLINKIT]: '#f6c90e',
  [PLATFORMS.PHONEPE]: '#5f259f',
};
