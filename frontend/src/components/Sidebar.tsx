import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  totalJobs?: number;
}

export default function Sidebar({ open, onClose, totalJobs }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function go(path: string) {
    navigate(path);
    onClose?.();
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">🎯</div>
          <div>
            <div className="logo-text">Job Hunter</div>
            <div className="logo-sub">Personal dashboard</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          <button
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => go('/')}
          >
            <span className="nav-icon">📋</span>
            Dashboard
            {totalJobs != null && <span className="nav-count">{totalJobs}</span>}
          </button>
          <button
            className={`nav-item ${location.pathname === '/stats' ? 'active' : ''}`}
            onClick={() => go('/stats')}
          >
            <span className="nav-icon">📊</span>
            Statistics
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout" onClick={() => api.logout()}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
