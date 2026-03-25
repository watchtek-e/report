import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { DailyReport } from './pages/DailyReport'
import { WeeklyReport } from './pages/WeeklyReport'
import { MonthlyReport } from './pages/MonthlyReport'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { useUserStore } from './store/userStore'
import './index.css'

const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useUserStore();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/login" replace />;

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return '내 업무 대시보드';
      case '/daily': return '일간 보고';
      case '/weekly': return '주간 시스템 취합 및 계획';
      case '/monthly': return '월간 시스템 취합 및 계획';
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          <PrivateLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily" element={<DailyReport />} />
              <Route path="/weekly" element={<WeeklyReport />} />
              <Route path="/monthly" element={<MonthlyReport />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </PrivateLayout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
