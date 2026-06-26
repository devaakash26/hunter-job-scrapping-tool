import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { isLoggedIn, UNAUTHORIZED_EVENT } from './lib/api';
import { ROUTES } from './lib/constants';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StatsPage from './pages/StatsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
}

// Navigates to login when the API reports lost auth (401) or on explicit logout.
function AuthRedirector() {
  const navigate = useNavigate();
  useEffect(() => {
    const onUnauthorized = () => navigate(ROUTES.LOGIN, { replace: true });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRedirector />
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.DASHBOARD} element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path={ROUTES.STATS} element={<RequireAuth><StatsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
