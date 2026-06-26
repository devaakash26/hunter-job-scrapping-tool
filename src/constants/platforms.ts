export const PLATFORMS = {
  // Job boards
  WELLFOUND: "wellfound",
  CUTSHORT: "cutshort",
  INSTAHYRE: "instahyre",
  LINKEDIN: "linkedin",
  YC: "yc",
  // Big 4 + MNCs
  GOOGLE: "google",
  MICROSOFT: "microsoft",
  AMAZON: "amazon",
  ORACLE: "oracle",
  // Indian startups — Lever ATS
  SWIGGY: "swiggy",
  RAZORPAY: "razorpay",
  ZEPTO: "zepto",
  MEESHO: "meesho",
  SCALER: "scaler",
  DREAM11: "dream11",
  URBANCOMPANY: "urbancompany",
  NYKAA: "nykaa",
  DUNZO: "dunzo",
  // Indian startups — Greenhouse ATS
  GROWW: "groww",
  CRED: "cred",
  FRESHWORKS: "freshworks",
  BROWSERSTACK: "browserstack",
  CHARGEBEE: "chargebee",
  HASURA: "hasura",
  POSTMAN: "postman",
  SLICE: "slice",
  JUSPAY: "juspay",
  SHARECHAT: "sharechat",
  // Indian startups — SmartRecruiters ATS
  INMOBI: "inmobi",
  MAKEMYTRIP: "makemytrip",
  CARS24: "cars24",
  UNACADEMY: "unacademy",
  // High-comp global product companies (India roles) — Greenhouse / Ashby ATS
  DATABRICKS: "databricks",
  HACKERRANK: "hackerrank",
  TWILIO: "twilio",
  GITLAB: "gitlab",
  RUBRIK: "rubrik",
  AIRBNB: "airbnb",
  COINBASE: "coinbase",
  MONGODB: "mongodb",
  STRIPE: "stripe",
  FIGMA: "figma",
  CLOUDFLARE: "cloudflare",
  SCALEAI: "scaleai",
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
  NOTION: "notion",
  // Indian startups — Playwright
  ZOMATO: "zomato",
  BLINKIT: "blinkit",
  PHONEPE: "phonepe",
  FLIPKART: "flipkart",
  PAYTM: "paytm",
  MYNTRA: "myntra",
  WALMART_TECH: "walmart_tech",
} as const;

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

export const PLATFORM_URLS = {
  // Job boards
  [PLATFORMS.WELLFOUND]:
    "https://wellfound.com/jobs?roles[]=full-stack-engineer&remote=true",
  [PLATFORMS.CUTSHORT]: "https://cutshort.io/jobs",
  [PLATFORMS.INSTAHYRE]: "https://www.instahyre.com/search-jobs/",
  [PLATFORMS.LINKEDIN]:
    "https://www.linkedin.com/jobs/search/?keywords=SDE+full+stack&location=India&f_E=1%2C2&f_WT=2",
  [PLATFORMS.YC]:
    "https://www.workatastartup.com/jobs?role=eng&subRole=full-stack&yoe_min=0&yoe_max=2&remote=true",
  // Big 4
  [PLATFORMS.GOOGLE]:
    "https://careers.google.com/jobs/results/?q=software+engineer&location=India",
  [PLATFORMS.MICROSOFT]:
    "https://jobs.careers.microsoft.com/global/en/search?q=software+engineer+india&l=en_us",
  [PLATFORMS.AMAZON]:
    "https://www.amazon.jobs/en/search?base_query=software+development+engineer&loc_query=India",
  [PLATFORMS.ORACLE]:
    "https://careers.oracle.com/jobs/#en/sites/jobsearch/jobs?keyword=software+engineer&location=India",
  // Lever ATS
  [PLATFORMS.SWIGGY]: "https://careers.swiggy.com/",
  [PLATFORMS.RAZORPAY]: "https://razorpay.com/jobs/",
  [PLATFORMS.ZEPTO]: "https://jobs.lever.co/zepto",
  [PLATFORMS.MEESHO]: "https://meesho.io/careers",
  [PLATFORMS.SCALER]: "https://jobs.lever.co/scaler-academy",
  [PLATFORMS.DREAM11]: "https://jobs.lever.co/dream11",
  [PLATFORMS.URBANCOMPANY]: "https://jobs.lever.co/urbancompany",
  [PLATFORMS.NYKAA]: "https://jobs.lever.co/nykaatech",
  [PLATFORMS.DUNZO]: "https://jobs.lever.co/dunzo",
  // Greenhouse ATS
  [PLATFORMS.GROWW]: "https://groww.in/careers",
  [PLATFORMS.CRED]: "https://careers.cred.club/",
  [PLATFORMS.FRESHWORKS]: "https://boards.greenhouse.io/freshworks",
  [PLATFORMS.BROWSERSTACK]: "https://boards.greenhouse.io/browserstack",
  [PLATFORMS.CHARGEBEE]: "https://boards.greenhouse.io/chargebee",
  [PLATFORMS.HASURA]: "https://boards.greenhouse.io/hasura",
  [PLATFORMS.POSTMAN]: "https://boards.greenhouse.io/postmanlabs",
  [PLATFORMS.SLICE]: "https://boards.greenhouse.io/getslice",
  [PLATFORMS.JUSPAY]: "https://boards.greenhouse.io/juspay",
  [PLATFORMS.SHARECHAT]: "https://boards.greenhouse.io/sharechat",
  // SmartRecruiters
  [PLATFORMS.INMOBI]: "https://jobs.smartrecruiters.com/InMobi",
  [PLATFORMS.MAKEMYTRIP]: "https://jobs.smartrecruiters.com/MakeMyTrip",
  // Playwright
  [PLATFORMS.ZOMATO]: "https://www.zomato.com/careers",
  [PLATFORMS.BLINKIT]: "https://blinkit.com/careers",
  [PLATFORMS.PHONEPE]: "https://www.phonepe.com/careers/",
  [PLATFORMS.FLIPKART]: "https://www.flipkartcareers.com/",
  [PLATFORMS.PAYTM]: "https://paytmjobs.com/",
  [PLATFORMS.MYNTRA]: "https://careers.myntra.com/",
  [PLATFORMS.WALMART_TECH]:
    "https://careers.walmart.com/results?q=software+engineer&locationCountry=IN",
} as const;

export const PLATFORM_LOGIN_URLS = {
  [PLATFORMS.WELLFOUND]: "https://wellfound.com/login",
  [PLATFORMS.CUTSHORT]: "https://cutshort.io/login",
  [PLATFORMS.LINKEDIN]: "https://www.linkedin.com/login",
} as const;
