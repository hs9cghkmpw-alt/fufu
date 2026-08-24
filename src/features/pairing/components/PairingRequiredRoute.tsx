import { Navigate, Outlet } from 'react-router-dom';
import { AuthLoading } from '../../auth/components/AuthLoading';
import { usePairing } from '../context/PairingContext';

export function PairingRequiredRoute() {
  const { coupleId, isLoading, error, refresh } = usePairing();
  if (isLoading) return <AuthLoading />;
  if (error)
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="form-error" role="alert">
            {error}
          </p>
          <button className="primary-button" type="button" onClick={() => void refresh()}>
            再読み込み
          </button>
        </div>
      </main>
    );
  return coupleId ? <Outlet /> : <Navigate to="/setup" replace />;
}
