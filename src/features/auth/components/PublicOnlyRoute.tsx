import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLoading } from './AuthLoading';

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  return user ? <Navigate to="/home" replace /> : <Outlet />;
}
