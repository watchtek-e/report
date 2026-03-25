import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Calendar, BarChart2, ClipboardCheck, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import './Sidebar.css';

export const Sidebar = () => {
  const location = useLocation();
  const { currentUser, logout } = useUserStore();

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
    }
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: '대시보드' },
    { to: '/daily', icon: <FileText size={18} />, label: '일간 보고' },
    { to: '/weekly', icon: <Calendar size={18} />, label: '주간 보고' },
    { to: '/monthly', icon: <BarChart2 size={18} />, label: '월간 보고' },
    { to: '/consolidation', icon: <ClipboardCheck size={18} />, label: '취합 확인' },
    { to: '/settings', icon: <SettingsIcon size={18} />, label: '시스템 설정' },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Watchtek Report</h1>
      </div>

      {currentUser && (
        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-info-row1">
              <span className="user-name">{currentUser.name} {currentUser.position}</span>
            </div>
            <div className="user-info-row2">
              <span className="user-dept">{currentUser.department}{currentUser.part ? ` · ${currentUser.part}` : ''}</span>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-content">
        <nav className="sidebar-nav">
          <ul>
            {navItems.map(item => (
              <li key={item.to} className={isActive(item.to) ? 'active' : ''}>
                <Link to={item.to}>
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
            <li style={{ marginTop: 'auto' }}>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                로그아웃
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
};
