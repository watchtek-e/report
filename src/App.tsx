import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { DailyReport } from './pages/DailyReport'
import { WeeklyReport } from './pages/WeeklyReport'
import { MonthlyReport } from './pages/MonthlyReport'
import { ConsolidationCheck } from './pages/ConsolidationCheck'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { useUserStore } from './store/userStore'
import { useReportStore } from './store/reportStore';
import { useSystemStore } from './store/systemStore';
import './index.css'

const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useUserStore();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/login" replace />;

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return '내 업무 대시보드';
      case '/daily': return '일간 보고';
      case '/weekly': return '주간 보고';
      case '/monthly': return '월간 보고';
      case '/consolidation': return '취합 확인';
      case '/settings': return '앱 설정 및 관리';
      default: return 'Watchtek Report';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <header className="app-topbar">
          <h1>{getPageTitle()}</h1>
        </header>
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  const { currentUser } = useUserStore();
  const getTeamUserIds = useUserStore((state) => state.getTeamUserIds);
  const startUserSync = useUserStore((state) => state.startUserSync);
  const stopUserSync = useUserStore((state) => state.stopUserSync);
  const startReportSync = useReportStore((state) => state.startReportSync);
  const stopReportSync = useReportStore((state) => state.stopReportSync);
  const startSystemSync = useSystemStore((state) => state.startSystemSync);
  const stopSystemSync = useSystemStore((state) => state.stopSystemSync);

  useEffect(() => {
    startUserSync();
    return () => stopUserSync();
  }, [startUserSync, stopUserSync]);

  useEffect(() => {
    startSystemSync();
    return () => stopSystemSync();
  }, [startSystemSync, stopSystemSync]);

  useEffect(() => {
    if (!currentUser) {
      stopReportSync();
      return;
    }

    const teamUserIds = getTeamUserIds(currentUser.department);
    const targets = teamUserIds.length > 0 ? teamUserIds : [currentUser.id];

    startReportSync(targets);
    return () => stopReportSync();
  }, [currentUser, getTeamUserIds, startReportSync, stopReportSync]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          <PrivateLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily" element={<DailyReport />} />
              <Route path="/weekly" element={<WeeklyReport />} />
              <Route path="/monthly" element={<MonthlyReport />} />
              <Route path="/consolidation" element={<ConsolidationCheck />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </PrivateLayout>
        } />
      </Routes>
    </HashRouter>
  )
}

export default App
