import { NavLink, Outlet } from 'react-router-dom';
import { OfflineBanner } from '../../pwa/components/OfflineBanner';
import { UpdatePrompt } from '../../pwa/components/UpdatePrompt';

const links = [
  { to: '/home', label: 'ホーム', icon: '⌂' },
  { to: '/requests', label: '申請', icon: '▤' },
  { to: '/calendar', label: 'カレンダー', icon: '▣' },
  { to: '/history', label: '履歴', icon: '◷' },
  { to: '/settings', label: '設定', icon: '⚙' }
] as const;

export function AppShell() {
  return (
    <div className="app-shell">
      <OfflineBanner />
      <header className="app-header">
        <span className="brand-mark" aria-hidden="true">
          ♡
        </span>
        <span>ふたりの約束</span>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="メインナビゲーション">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <UpdatePrompt />
    </div>
  );
}
