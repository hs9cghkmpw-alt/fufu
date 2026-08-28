import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../../shared/components/AppShell';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { PasswordResetPage } from '../../features/auth/pages/PasswordResetPage';
import { SignupPage } from '../../features/auth/pages/SignupPage';
import { UpdatePasswordPage } from '../../features/auth/pages/UpdatePasswordPage';
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute';
import { PublicOnlyRoute } from '../../features/auth/components/PublicOnlyRoute';
import { CalendarPage } from '../../features/calendar/pages/CalendarPage';
import { CalendarEventDetailPage } from '../../features/calendar/pages/CalendarEventDetailPage';
import { NewCalendarEventPage } from '../../features/calendar/pages/NewCalendarEventPage';
import { HistoryPage } from '../../features/history/pages/HistoryPage';
import { HomePage } from '../../features/home/pages/HomePage';
import { SetupPage } from '../../features/pairing/pages/SetupPage';
import { PairingRequiredRoute } from '../../features/pairing/components/PairingRequiredRoute';
import { RequestsPage } from '../../features/requests/pages/RequestsPage';
import { NewRequestPage } from '../../features/requests/pages/NewRequestPage';
import { RequestDetailPage } from '../../features/requests/pages/RequestDetailPage';
import { SettingsPage } from '../../features/settings/pages/SettingsPage';
import { AgreementsPage } from '../../features/agreements/pages/AgreementsPage';
import { AgreementDetailPage } from '../../features/agreements/pages/AgreementDetailPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/password-reset', element: <PasswordResetPage /> }
    ]
  },
  { path: '/update-password', element: <UpdatePasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/setup', element: <SetupPage /> },
      {
        element: <AppShell />,
        children: [
          { path: '/settings', element: <SettingsPage /> },
          {
            element: <PairingRequiredRoute />,
            children: [
              { path: '/home', element: <HomePage /> },
              { path: '/requests', element: <RequestsPage /> },
              { path: '/requests/new', element: <NewRequestPage /> },
              { path: '/requests/:id', element: <RequestDetailPage /> },
              { path: '/agreements', element: <AgreementsPage /> },
              { path: '/agreements/:id', element: <AgreementDetailPage /> },
              { path: '/calendar', element: <CalendarPage /> },
              { path: '/calendar/new', element: <NewCalendarEventPage /> },
              { path: '/calendar/:id', element: <CalendarEventDetailPage /> },
              { path: '/history', element: <HistoryPage /> }
            ]
          }
        ]
      }
    ]
  },
  { path: '*', element: <Navigate to="/home" replace /> }
]);
