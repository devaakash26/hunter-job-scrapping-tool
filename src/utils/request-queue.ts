import PQueue from 'p-queue';
import { RATE_LIMIT } from '../constants';

export interface RateLimitOptions {
  // Only `intervalCap` requests are started per `interval` window.
  interval: number;
  intervalCap: number;
  concurrency: number;
}

// One queue per host/site so a bot-protected platform (LinkedIn, Workday, …)
// is throttled globally no matter how many scrapers or pages hit it, while
// other platforms keep their own independent budgets.
const queues = new Map<string, PQueue>();

export function getRequestQueue(key: string, options?: RateLimitOptions): PQueue {
  let queue = queues.get(key);
  if (!queue) {
    const opts = options ?? RATE_LIMIT.DEFAULT;
    queue = new PQueue({
      interval: opts.interval,
      intervalCap: opts.intervalCap,
      concurrency: opts.concurrency,
    });
    queues.set(key, queue);
  }
  return queue;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  // 429 = rate limited, 5xx = transient upstream failure; no status = network error/timeout.
  return status === undefined || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run `fn` through `queue` with exponential backoff on rate-limit/transient
// failures. Non-retryable errors (4xx other than 429) are thrown immediately.
export async function enqueueWithRetry<T>(
  queue: PQueue,
  fn: () => Promise<T>,
  label: string,
  retries: number = RATE_LIMIT.MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return (await queue.add(fn)) as T;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) break;

      const backoff = RATE_LIMIT.BACKOFF_BASE_MS * 2 ** (attempt - 1);
      console.warn(
        `[${new Date().toISOString()}] [QUEUE] ${label}: attempt ${attempt} failed, retrying in ${backoff}ms`,
      );
      await sleep(backoff);
    }
  }

  throw lastError;
}
