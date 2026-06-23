// Shared India-location matcher for the ATS scrapers. Global companies (e.g.
// Databricks, Stripe) post worldwide, so we keep only their India roles. A bare
// "remote"/"hybrid" is intentionally NOT enough — it must name India or an
// Indian metro, otherwise US-remote roles would leak in.
const INDIA_LOCATION_KEYWORDS = [
  'india',
  'bengaluru',
  'bangalore',
  'mumbai',
  'new delhi',
  'delhi',
  'gurgaon',
  'gurugram',
  'hyderabad',
  'pune',
  'chennai',
  'noida',
  'kolkata',
  'ahmedabad',
  'jaipur',
  'coimbatore',
  'thiruvananthapuram',
];

export function isIndiaLocation(...parts: (string | null | undefined)[]): boolean {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return INDIA_LOCATION_KEYWORDS.some((kw) => haystack.includes(kw));
}
