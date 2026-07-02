import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import { cacheGet, cacheSet, cacheClear } from '../lib/cache';
import type { Job, JobStatus, JobsResponse, Stats } from '../lib/types';
import {
  JOB_STATUSES,
  STATUS_COLORS,
  STATUS_BG,
  BRAND_INDIGO,
  STATUS_ALL_COLOR,
  platformColor,
} from '../lib/constants';
import Sidebar from '../components/Sidebar';

// How long the Run-Scraper button shows its done/error state before resetting.
const SCRAPER_RESET_MS = 4000;
// How long a transient action error (e.g. failed status update) stays visible.
const ACTION_ERROR_MS = 4000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function parseTags(tags: string): string[] {
  return (tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 4);
}

function avatarStyle(color: string) {
  return { background: color + '1a', border: `1.5px solid ${color}33`, color };
}

export default function DashboardPage() {
  const [status, setStatus]           = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [source, setSource]           = useState('');
  const [sortBy, setSortBy]           = useState('newest');
  const [easyApply, setEasyApply]     = useState(false);
  const [hasSalary, setHasSalary]     = useState(false);

  const [jobs, setJobs]               = useState<Job[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  // True while cached results are on screen and a background refresh is in flight.
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [cursor, setCursor]           = useState(1);
  const [reloadKey, setReloadKey]     = useState(0);

  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [sources, setSources]           = useState<string[]>([]);
  const [actionError, setActionError]   = useState('');

  const [scraperState, setScraperState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Controller for the active filter "session"; aborting it cancels any in-flight
  // page-1 or load-more request so a stale response can't overwrite newer results.
  const abortRef = useRef<AbortController | null>(null);
  // Synchronous guard against the IntersectionObserver firing loadMore twice.
  const loadingMoreRef = useRef(false);

  // A new object whenever any filter changes, which drives the reset-and-reload effect.
  const filterParams = useMemo(() => {
    const p: Record<string, string> = { sortBy };
    if (status !== 'all') p.status = status;
    if (search)    p.search    = search;
    if (source)    p.source    = source;
    if (easyApply) p.easyApply = '1';
    if (hasSalary) p.hasSalary = '1';
    return p;
  }, [status, search, source, sortBy, easyApply, hasSalary]);

  // Debounced live search — results update as you type, no Enter needed.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load page 1 whenever filters change — cache-first, revalidate in background.
  // A cached filter renders instantly (no spinner, no blank list); the network
  // response then replaces it and refreshes the cache.
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const cacheKey = `jobs:${JSON.stringify(filterParams)}`;
    const cached = cacheGet<JobsResponse>(cacheKey);

    setError(false);
    setCursor(1);

    if (cached) {
      setJobs(cached.jobs);
      setTotal(cached.total);
      setHasMore(cached.totalPages > 1);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setJobs([]);
      setHasMore(false);
    }

    api.getJobs({ ...filterParams, page: '1' }, controller.signal)
      .then(data => {
        cacheSet(cacheKey, data);
        setJobs(data.jobs);
        setTotal(data.total);
        setHasMore(data.totalPages > 1);
        setCursor(1);
      })
      .catch(err => {
        if (controller.signal.aborted) return; // superseded by a newer filter change
        console.error('Failed to load jobs:', err);
        if (!cached) setError(true); // keep showing cached data on refresh failure
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [filterParams, reloadKey]);

  // Load and append the next page (infinite scroll).
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore) return;
    const controller = abortRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const next = cursor + 1;

    api.getJobs({ ...filterParams, page: String(next) }, controller?.signal)
      .then(data => {
        setJobs(prev => [...prev, ...data.jobs]);
        setHasMore(next < data.totalPages);
        setCursor(next);
      })
      .catch(err => {
        if (controller?.signal.aborted) return;
        console.error('Failed to load more jobs:', err);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [hasMore, cursor, filterParams]);

  // Fire loadMore when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // Sidebar counts + the platform filter's source list — cache-first as well.
  useEffect(() => {
    const apply = (s: Stats) => {
      setStatusCounts(s.byStatus);
      setSources(Object.keys(s.bySource).sort((a, b) => s.bySource[b] - s.bySource[a]));
    };
    const cached = cacheGet<Stats>('stats');
    if (cached) apply(cached);
    api.getStats()
      .then(s => {
        cacheSet('stats', s);
        apply(s);
      })
      .catch(err => console.error('Failed to load stats:', err));
  }, [reloadKey]);

  async function handleRunScraper() {
    if (scraperState === 'running') return;
    setScraperState('running');
    try {
      await api.runScraper();
      // New jobs are incoming — cached lists/counts are about to go stale.
      cacheClear();
      setScraperState('done');
    } catch {
      setScraperState('error');
    } finally {
      setTimeout(() => setScraperState('idle'), SCRAPER_RESET_MS);
    }
  }

  async function handleStatusChange(id: number, next: string) {
    const previous = jobs.find(j => j.id === id)?.status;
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: next as JobStatus } : j)));
    try {
      await api.updateStatus(id, next);
    } catch {
      // Revert the optimistic change and let the user know it didn't stick.
      if (previous) {
        setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: previous } : j)));
      }
      setActionError('Could not update status — please retry.');
      setTimeout(() => setActionError(''), ACTION_ERROR_MS);
    }
  }

  function clearAll() {
    setSearch(''); setSearchInput(''); setSource('');
    setEasyApply(false); setHasSalary(false);
    setSortBy('newest'); setStatus('all');
  }

  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const anyFilter = search || source || easyApply || hasSalary || status !== 'all' || sortBy !== 'newest';

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} totalJobs={totalAll} />

      <div className="main">
        <div className="page-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="page-title">Job Dashboard</div>
          <button
            className="run-scraper-btn"
            onClick={handleRunScraper}
            disabled={scraperState === 'running'}
            title="Scrape all platforms now"
          >
            {scraperState === 'running' && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />}
            {scraperState === 'idle'    && '⚡'}
            {scraperState === 'done'    && '✓'}
            {scraperState === 'error'   && '✕'}
            <span>
              {scraperState === 'running' ? 'Running…' :
               scraperState === 'done'    ? 'Started!' :
               scraperState === 'error'   ? 'Failed'   : 'Run Scraper'}
            </span>
          </button>
          <div className="header-stats">
            <span className="hstat hstat-total">
              <span className="hstat-dot" style={{ background: BRAND_INDIGO }} />
              {totalAll} Total
            </span>
            <span className="hstat hstat-new">
              <span className="hstat-dot" style={{ background: STATUS_COLORS.new }} />
              {statusCounts.new ?? 0} New
            </span>
            <span className="hstat hstat-applied">
              <span className="hstat-dot" style={{ background: STATUS_COLORS.applied }} />
              {statusCounts.applied ?? 0} Applied
            </span>
            {(statusCounts.interview ?? 0) > 0 && (
              <span className="hstat hstat-interview">
                <span className="hstat-dot" style={{ background: STATUS_COLORS.interview }} />
                {statusCounts.interview} Interview{statusCounts.interview > 1 ? 's' : ''}
              </span>
            )}
            {(statusCounts.offer ?? 0) > 0 && (
              <span className="hstat hstat-offer">🎉 {statusCounts.offer} Offer!</span>
            )}
          </div>
        </div>

        <div className="page-body">
          {actionError && <div className="action-error">{actionError}</div>}

          <div className="status-row">
            <button
              className={`status-tab ${status === 'all' ? 'active' : ''}`}
              style={status === 'all' ? { background: STATUS_ALL_COLOR, borderColor: STATUS_ALL_COLOR } : {}}
              onClick={() => setStatus('all')}
            >
              All ({totalAll})
            </button>
            {JOB_STATUSES.map(s => (
              <button key={s}
                className={`status-tab ${status === s ? 'active' : ''}`}
                style={status === s ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}
                onClick={() => setStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] ?? 0})
              </button>
            ))}
            {!loading && !error && (
              <span className="results-meta">
                {refreshing && <span className="refresh-dot" title="Refreshing…" />}
                <strong>{jobs.length}</strong> of <strong>{total}</strong>
              </span>
            )}
          </div>

          <div className="filters-wrap">
            <div className="filters-bar">
              <form className="search-wrap" onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text" placeholder="Search title, company or tags…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </form>

              <select className="filter-select" value={source} onChange={e => setSource(e.target.value)}>
                <option value="">All platforms</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 140 }}>
                <option value="newest">↓ Newest first</option>
                <option value="oldest">↑ Oldest first</option>
                <option value="company">A–Z Company</option>
              </select>

              <div className="filter-divider" />

              <div className="filter-toggles">
                <button className={`filter-toggle ${easyApply ? 'on' : ''}`} onClick={() => setEasyApply(v => !v)}>⚡ Easy Apply</button>
                <button className={`filter-toggle ${hasSalary ? 'on' : ''}`} onClick={() => setHasSalary(v => !v)}>💰 Has Salary</button>
              </div>

              {anyFilter && (
                <button className="filter-toggle" onClick={clearAll} style={{ marginLeft: 'auto', opacity: 0.6 }}>✕ Clear</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="jobs-list">
              {Array.from({ length: 6 }, (_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <div className="empty-title">Couldn’t load jobs</div>
              <div className="empty-sub">Check your connection or that the backend is running.</div>
              <button className="filter-toggle" onClick={() => setReloadKey(k => k + 1)}>Retry</button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No jobs found</div>
              <div className="empty-sub">Try adjusting the filters or clear all to start fresh</div>
            </div>
          ) : (
            <div className="jobs-list">
              {jobs.map(job => (
                <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
              ))}

              <div ref={sentinelRef} style={{ height: 1 }} />

              {loadingMore && (
                <div className="load-more-spinner">
                  <div className="spinner" /> Loading more jobs…
                </div>
              )}

              {!hasMore && jobs.length > 0 && (
                <div className="end-of-list">
                  All {total.toLocaleString()} jobs loaded ✓
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Shimmer placeholder shown on a cold load (no cached data for this filter yet).
function JobCardSkeleton() {
  return (
    <div className="job-card skeleton-card">
      <div className="job-accent sk-bg" />
      <div className="job-body">
        <div className="job-top">
          <span className="sk sk-badge" />
          <span className="sk sk-badge" style={{ width: 74 }} />
          <span className="sk sk-pill" />
        </div>
        <div className="job-main">
          <div className="sk sk-avatar" />
          <div className="job-info">
            <div className="sk sk-line" style={{ width: '55%' }} />
            <div className="sk sk-line sk-line-sm" style={{ width: '35%' }} />
          </div>
        </div>
        <div className="job-bottom">
          <span className="sk sk-line sk-line-sm" style={{ width: 90 }} />
          <span className="sk sk-btn" />
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onStatusChange }: { job: Job; onStatusChange: (id: number, s: string) => void }) {
  const tags  = parseTags(job.tags);
  const color = platformColor(job.source);
  const initial = job.company.charAt(0).toUpperCase();

  return (
    <div className="job-card">
      <div className="job-accent" style={{ background: color }} />
      <div className="job-body">
        <div className="job-top">
          <span className="source-badge" style={{ background: color }}>{job.source}</span>
          {job.easyApply && <span className="easy-badge">⚡ Easy Apply</span>}
          {job.ycBatch   && <span className="yc-badge">🚀 {job.ycBatch}</span>}
          <div className="status-pill-wrap">
            <select
              className="status-pill"
              value={job.status}
              onChange={e => onStatusChange(job.id, e.target.value)}
              style={{
                background: STATUS_BG[job.status] ?? '#f3f4f6',
                color: STATUS_COLORS[job.status] ?? '#6b7280',
                borderColor: (STATUS_COLORS[job.status] ?? '#e2e4ea') + '55',
              }}
            >
              {JOB_STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="job-main">
          <div className="company-avatar" style={avatarStyle(color)}>{initial}</div>
          <div className="job-info">
            <div className="job-title">{job.title}</div>
            <div className="job-meta">
              <span>{job.company}</span>
              {job.location && <><span className="dot">·</span><span>{job.location}</span></>}
              {job.salary && job.salary !== 'Not mentioned' && (
                <><span className="dot">·</span><span className="salary-chip">💰 {job.salary}</span></>
              )}
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="job-tags">
            {tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}

        <div className="job-bottom">
          <span className="posted-date">
            {job.postedAt ? `Posted ${job.postedAt}` : `Added ${timeAgo(job.createdAt)}`}
          </span>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="apply-btn">Apply →</a>
        </div>
      </div>
    </div>
  );
}
