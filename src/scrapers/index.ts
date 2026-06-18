import { BaseScraper } from './base.scraper';
import { WellfoundScraper } from './wellfound.scraper';
import { CutshortScraper } from './cutshort.scraper';
import { InstahyreScraper } from './instahyre.scraper';
import { LinkedInScraper } from './linkedin.scraper';
import { YCombinatorScraper } from './ycombinator.scraper';

export const ALL_SCRAPERS: BaseScraper[] = [
  new WellfoundScraper(),
  new CutshortScraper(),
  new InstahyreScraper(),
  new LinkedInScraper(),
  new YCombinatorScraper(),
];

export {
  BaseScraper,
  WellfoundScraper,
  CutshortScraper,
  InstahyreScraper,
  LinkedInScraper,
  YCombinatorScraper,
};
