export const JOB_STATUSES = ['new', 'saved', 'applied', 'interview', 'rejected', 'offer'] as const;

export const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  saved: '#8b5cf6',
  applied: '#f59e0b',
  interview: '#10b981',
  rejected: '#ef4444',
  offer: '#22c55e',
};

export const STATUS_BG: Record<string, string> = {
  new: 'rgba(59,130,246,0.1)',
  saved: 'rgba(139,92,246,0.1)',
  applied: 'rgba(245,158,11,0.1)',
  interview: 'rgba(16,185,129,0.1)',
  rejected: 'rgba(239,68,68,0.1)',
  offer: 'rgba(34,197,94,0.1)',
};

export const PLATFORM_COLORS: Record<string, string> = {
  wellfound: '#f97316', cutshort: '#8b5cf6', instahyre: '#06b6d4',
  linkedin: '#0077b5', yc: '#f97316', google: '#4285f4',
  microsoft: '#00a4ef', amazon: '#ff9900', oracle: '#c74634',
  swiggy: '#fc8019', razorpay: '#2d81f7', zepto: '#7c3aed',
  meesho: '#f43f5e', scaler: '#ff6b35', dream11: '#1a73e8',
  urbancompany: '#7b2ff7', nykaa: '#fc2779', dunzo: '#00b140',
  groww: '#00d09c', cred: '#1a1a2e', freshworks: '#25c16f',
  browserstack: '#e84c3d', chargebee: '#ff7a59', hasura: '#1eb4d4',
  postman: '#ff6c37', slice: '#5a31e1', juspay: '#3d4eac',
  sharechat: '#f5a623', inmobi: '#ef5426', makemytrip: '#e8340b',
  cars24: '#f5b300', unacademy: '#08bd80', databricks: '#ff3621',
  hackerrank: '#00ea64', twilio: '#f22f46', gitlab: '#fc6d26',
  rubrik: '#00b388', airbnb: '#ff5a5f', coinbase: '#0052ff',
  mongodb: '#00ed64', stripe: '#635bff', figma: '#f24e1e',
  cloudflare: '#f38020', scaleai: '#5468ff', anthropic: '#d97757',
  openai: '#10a37f', notion: '#000000', zomato: '#e23744',
  blinkit: '#f6c90e', phonepe: '#5f259f', flipkart: '#2874f0',
  paytm: '#00b9f1', myntra: '#ff3f6c', walmart_tech: '#0071ce',
};

export function platformColor(source: string): string {
  return PLATFORM_COLORS[source.toLowerCase()] ?? '#6b7280';
}
