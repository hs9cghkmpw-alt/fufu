import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function renderRoute(value: AuthContextValue) {
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/login" element={<h1>ログイン</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<h1>ホーム</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderRoute({ session: null, user: null, isLoading: false, signOut: async () => undefined });
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('waits while restoring a session', () => {
    renderRoute({ session: null, user: null, isLoading: true, signOut: async () => undefined });
    expect(screen.getByText('セッションを確認しています…')).toBeInTheDocument();
  });
});
