// Extract the minimum years-of-experience a job asks for from free text
// (title, tags, or description). Returns null when nothing is mentioned.

const RANGE_RE = /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/i;
const PLUS_RE = /(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)/i;
const MIN_RE = /(?:minimum|min\.?|at\s*least)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i;
// A bare "N years" only counts when experience is explicitly nearby, so
// unrelated mentions ("founded 5 years ago") don't reject a job.
const BARE_RE = /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:relevant\s*)?(?:experience|exp\b)/i;
const BARE_REVERSED_RE = /experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i;

const FRESHER_RE = /fresher|new\s*grad|recent\s*graduate|entry[\s-]*level|campus\s*hire|early\s*career/i;

export interface ExperienceRange {
  min: number;
  max: number | null;
}

export function extractExperience(text: string): ExperienceRange | null {
  if (!text) return null;

  if (FRESHER_RE.test(text)) return { min: 0, max: null };

  const range = text.match(RANGE_RE);
  if (range) return { min: parseFloat(range[1]), max: parseFloat(range[2]) };

  const plus = text.match(PLUS_RE);
  if (plus) return { min: parseFloat(plus[1]), max: null };

  const min = text.match(MIN_RE);
  if (min) return { min: parseFloat(min[1]), max: null };

  const bare = text.match(BARE_RE) ?? text.match(BARE_REVERSED_RE);
  if (bare) return { min: parseFloat(bare[1]), max: null };

  return null;
}

export function formatExperience(range: ExperienceRange | null): string {
  if (!range) return '';
  if (range.max !== null) return `${range.min}-${range.max} yrs`;
  return `${range.min}+ yrs`;
}
