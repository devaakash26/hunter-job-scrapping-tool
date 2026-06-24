import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../lib/api';
import type { Job, JobStatus } from '../lib/types';
import { JOB_STATUSES, STATUS_COLORS, STATUS_BG, platformColor } from '../lib/constants';
import Sidebar from '../components/Sidebar';

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
  // Filter state
  const [status, setStatus]           = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [source, setSource]           = useState('');
  const [sortBy, setSortBy]           = useState('newest');
  const [easyApply, setEasyApply]     = useState(false);
  const [hasSalary, setHasSalary]     = useState(false);

  // Data state
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [cursor, setCursor]           = useState(1);

  // Sidebar + aux state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [sources, setSources]           = useState<string[]>([]);

  // Manual scraper trigger
  const [scraperState, setScraperState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Memoized filter params — a new object is created whenever any filter changes,
  // which triggers the reset-and-reload effect below.
  const filterParams = useMemo(() => {
    const p: Record<string, string> = { sortBy };
    if (status !== 'all') p.status = status;
    if (search)    p.search    = search;
    if (source)    p.source    = source;
    if (easyApply) p.easyApply = '1';
    if (hasSalary) p.hasSalary = '1';
    return p;
  }, [status, search, source, sortBy, easyApply, hasSalary]);

  // Reset and load page 1 when filters change
  useEffect(() => {
    setLoading(true);
    setJobs([]);
    setCursor(1);
    setHasMore(false);

    api.getJobs({ ...filterParams, page: '1' })
      .then(data => {
        setJobs(data.jobs);
        setTotal(data.total);
        setHasMore(data.totalPages > 1);
        setCursor(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterParams]);

  // Load next page (append)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = cursor + 1;

    api.getJobs({ ...filterParams, page: String(next) })
      .then(data => {
        setJobs(prev => [...prev, ...data.jobs]);
        setHasMore(next < data.totalPages);
        setCursor(next);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, cursor, filterParams]);

  // Intersection observer — fires loadMore when sentinel enters viewport
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

  // Fetch stats (sidebar count + filter sources)
  useEffect(() => {
    api.getStats().then(s => {
      setStatusCounts(s.byStatus);
      setSources(Object.keys(s.bySource).sort((a, b) => s.bySource[b] - s.bySource[a]));
    }).catch(() => {});
  }, []);

  function setFilter<T>(setter: (v: T) => void, val: T) {
    setter(val);
  }

  async function handleRunScraper() {
    if (scraperState === 'running') return;
    setScraperState('running');
    try {
      await api.runScraper();
      setScraperState('done');
      setTimeout(() => setScraperState('idle'), 4000);
    } catch {
      setScraperState('error');
      setTimeout(() => setScraperState('idle'), 4000);
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
        {/* Header */}
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
              <span className="hstat-dot" style={{ background: '#6366f1' }} />
              {totalAll} Total
            </span>
            <span className="hstat hstat-new">
              <span className="hstat-dot" style={{ background: '#3b82f6' }} />
              {statusCounts.new ?? 0} New
            </span>
            <span className="hstat hstat-applied">
              <span className="hstat-dot" style={{ background: '#f59e0b' }} />
              {statusCounts.applied ?? 0} Applied
            </span>
            {(statusCounts.interview ?? 0) > 0 && (
              <span className="hstat hstat-interview">
                <span className="hstat-dot" style={{ background: '#10b981' }} />
                {statusCounts.interview} Interview{statusCounts.interview > 1 ? 's' : ''}
              </span>
            )}
            {(statusCounts.offer ?? 0) > 0 && (
              <span className="hstat hstat-offer">🎉 {statusCounts.offer} Offer!</span>
            )}
          </div>
        </div>

        <div className="page-body">
          {/* Status tabs */}
          <div className="status-row">
            <button
              className={`status-tab ${status === 'all' ? 'active' : ''}`}
              style={status === 'all' ? { background: '#334155', borderColor: '#334155' } : {}}
              onClick={() => setFilter(setStatus, 'all')}
            >
              All ({totalAll})
            </button>
            {JOB_STATUSES.map(s => (
              <button key={s}
                className={`status-tab ${status === s ? 'active' : ''}`}
                style={status === s ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}
                onClick={() => setFilter(setStatus, s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] ?? 0})
              </button>
            ))}
            {!loading && (
              <span className="results-meta">
                <strong>{jobs.length}</strong> of <strong>{total}</strong>
              </span>
            )}
          </div>

          {/* Filters bar */}
          <div className="filters-wrap">
            <div className="filters-bar">
              <form className="search-wrap" onSubmit={e => { e.preventDefault(); setFilter(setSearch, searchInput); }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text" placeholder="Search title, company or tags…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onBlur={() => setFilter(setSearch, searchInput)}
                />
              </form>

              <select className="filter-select" value={source} onChange={e => setFilter(setSource, e.target.value)}>
                <option value="">All platforms</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select className="filter-select" value={sortBy} onChange={e => setFilter(setSortBy, e.target.value)} style={{ maxWidth: 140 }}>
                <option value="newest">↓ Newest first</option>
                <option value="oldest">↑ Oldest first</option>
                <option value="company">A–Z Company</option>
              </select>

              <div className="filter-divider" />

              <div className="filter-toggles">
                <button className={`filter-toggle ${easyApply ? 'on' : ''}`} onClick={() => setFilter(setEasyApply, !easyApply)}>⚡ Easy Apply</button>
                <button className={`filter-toggle ${hasSalary ? 'on' : ''}`} onClick={() => setFilter(setHasSalary, !hasSalary)}>💰 Has Salary</button>
              </div>

              {anyFilter && (
                <button className="filter-toggle" onClick={clearAll} style={{ marginLeft: 'auto', opacity: 0.6 }}>✕ Clear</button>
              )}
            </div>
          </div>

          {/* Job list */}
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /> Loading jobs…</div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No jobs found</div>
              <div className="empty-sub">Try adjusting the filters or clear all to start fresh</div>
            </div>
          ) : (
            <div className="jobs-list">
              {jobs.map(job => (
                <JobCard key={job.id} job={job}
                  onStatusChange={async (id, s) => {
                    await api.updateStatus(id, s);
                    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: s as JobStatus } : j));
                  }}
                />
              ))}

              {/* Sentinel — IntersectionObserver watches this element */}
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
