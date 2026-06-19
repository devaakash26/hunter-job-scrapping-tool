import { BaseScraper } from './base.scraper';
import { WellfoundScraper } from './wellfound.scraper';
import { CutshortScraper } from './cutshort.scraper';
import { InstahyreScraper } from './instahyre.scraper';
import { LinkedInScraper } from './linkedin.scraper';
import { YCombinatorScraper } from './ycombinator.scraper';
import { GoogleScraper } from './google.scraper';
import { MicrosoftScraper } from './microsoft.scraper';
import { AmazonScraper } from './amazon.scraper';
import { OracleScraper } from './oracle.scraper';
import { LeverScraper } from './lever.scraper';
import { GreenhouseScraper } from './greenhouse.scraper';
import { SmartRecruitersScraper } from './smartrecruiters.scraper';
import { StartupsScraper } from './startups.scraper';

export const ALL_SCRAPERS: BaseScraper[] = [
  // Job boards (auth-required — use cookies)
  new WellfoundScraper(),
  new CutshortScraper(),
  new LinkedInScraper(),
  // Job boards (no auth)
  new InstahyreScraper(),
  new YCombinatorScraper(),
  // Big 4 + MNCs via public APIs
  new GoogleScraper(),
  new MicrosoftScraper(),
  new AmazonScraper(),
  new OracleScraper(),
  // Indian startups via Lever / Greenhouse / SmartRecruiters APIs (no auth)
  new LeverScraper(),
  new GreenhouseScraper(),
  new SmartRecruitersScraper(),
  // Indian startups via Playwright
  new StartupsScraper(),
];

export {
  BaseScraper,
  WellfoundScraper,
  CutshortScraper,
  InstahyreScraper,
  LinkedInScraper,
  YCombinatorScraper,
  GoogleScraper,
  MicrosoftScraper,
  AmazonScraper,
  OracleScraper,
  LeverScraper,
  GreenhouseScraper,
  SmartRecruitersScraper,
  StartupsScraper,
};
