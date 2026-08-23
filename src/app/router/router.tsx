import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../../shared/components/AppShell';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { CalendarPage } from '../../features/calendar/pages/CalendarPage';
import { HistoryPage } from '../../features/history/pages/HistoryPage';
import { HomePage } from '../../features/home/pages/HomePage';
import { SetupPage } from '../../features/pairing/pages/SetupPage';
import { RequestsPage } from '../../features/requests/pages/RequestsPage';
import { SettingsPage } from '../../features/settings/pages/SettingsPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/setup', element: <SetupPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/requests', element: <RequestsPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/settings', element: <SettingsPage /> }
    ]
  },
  { path: '*', element: <Navigate to="/home" replace /> }
]);
