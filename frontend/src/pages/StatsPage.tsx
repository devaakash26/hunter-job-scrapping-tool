import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Stats } from '../lib/types';
import { STATUS_COLORS, BRAND_INDIGO, platformColor } from '../lib/constants';
import Sidebar from '../components/Sidebar';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.getStats()
      .then(s => setStats(s))
      .catch(err => console.error('Failed to fetch stats:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <div className="page-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="page-title">Statistics</div>
        </div>

        <div className="page-body">
          {loading && <div className="loading-wrap"><div className="spinner" /> Loading stats…</div>}
          {!loading && !stats && (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <div className="empty-title">Failed to load statistics</div>
              <div className="empty-sub">Check that the backend is running</div>
            </div>
          )}
          {stats && <StatsContent stats={stats} />}
        </div>
      </div>
    </>
  );
}

function StatsContent({ stats }: { stats: Stats }) {
  const statusEntries = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]);
  const sourceEntries = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxStatus = Math.max(...statusEntries.map(e => e[1]), 1);
  const maxSource = Math.max(...sourceEntries.map(e => e[1]), 1);
  const weekChange = stats.thisWeek - stats.lastWeek;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-label">Total Jobs</div>
          <div className="stat-value" style={{ color: BRAND_INDIGO }}>{stats.total.toLocaleString()}</div>
          <div className="stat-sub">across all platforms</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-label">This Week</div>
          <div className="stat-value" style={{ color: STATUS_COLORS.new }}>{stats.thisWeek}</div>
          <div className="stat-sub">
            {weekChange >= 0
              ? <span className="stat-positive">↑ {weekChange} vs last week</span>
              : <span className="stat-negative">↓ {Math.abs(weekChange)} vs last week</span>}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-label">Applied</div>
          <div className="stat-value" style={{ color: STATUS_COLORS.applied }}>{stats.byStatus.applied ?? 0}</div>
          <div className="stat-sub">jobs applied to</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🤝</div>
          <div className="stat-label">Interviews</div>
          <div className="stat-value" style={{ color: STATUS_COLORS.interview }}>{stats.byStatus.interview ?? 0}</div>
          <div className="stat-sub"><span className="stat-positive">{stats.responseRate}% response rate</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎉</div>
          <div className="stat-label">Offers</div>
          <div className="stat-value" style={{ color: STATUS_COLORS.offer }}>{stats.byStatus.offer ?? 0}</div>
          <div className="stat-sub">received</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔖</div>
          <div className="stat-label">Saved</div>
          <div className="stat-value" style={{ color: STATUS_COLORS.saved }}>{stats.byStatus.saved ?? 0}</div>
          <div className="stat-sub">to apply later</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-card">
          <div className="chart-title">By Status</div>
          {statusEntries.map(([s, count]) => (
            <div key={s} className="bar-item">
              <div className="bar-label-row">
                <span className="bar-name">{s}</span>
                <span className="bar-count">{count}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(count / maxStatus) * 100}%`, background: STATUS_COLORS[s] ?? '#6b7280' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="chart-card">
          <div className="chart-title">Top Platforms</div>
          {sourceEntries.map(([src, count]) => (
            <div key={src} className="bar-item">
              <div className="bar-label-row">
                <span className="bar-name">{src}</span>
                <span className="bar-count">{count}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(count / maxSource) * 100}%`, background: platformColor(src) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
