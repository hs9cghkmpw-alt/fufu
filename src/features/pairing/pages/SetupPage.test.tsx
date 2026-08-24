import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PairingState } from '../context/PairingContext';
import { SetupPage } from './SetupPage';

const usePairing = vi.fn<() => PairingState>();
vi.mock('../context/PairingContext', () => ({ usePairing: () => usePairing() }));

const base: PairingState = {
  coupleId: null,
  members: [],
  isLoading: false,
  error: '',
  refresh: vi.fn(),
  createCouple: vi.fn(),
  joinCouple: vi.fn()
};

describe('SetupPage', () => {
  beforeEach(() => usePairing.mockReturnValue(base));

  it('shows loading without flashing setup actions', () => {
    usePairing.mockReturnValue({ ...base, isLoading: true });
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>
    );
    expect(screen.getByText('ペアリング状態を確認しています…')).toBeInTheDocument();
    expect(screen.queryByText('新しく作る')).not.toBeInTheDocument();
  });

  it('shows create and join actions to an unpaired user', () => {
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: '新しい夫婦スペースを作る' })).toBeVisible();
    expect(screen.getByRole('button', { name: '招待コードで参加' })).toBeVisible();
  });

  it('shows the completed state for two members', () => {
    usePairing.mockReturnValue({
      ...base,
      coupleId: 'couple-id',
      members: [
        { id: '1', userId: 'a', roleLabel: null, joinedAt: '2026-08-24T00:00:00Z' },
        { id: '2', userId: 'b', roleLabel: null, joinedAt: '2026-08-24T00:01:00Z' }
      ]
    });
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'ペアリング完了' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'ホームへ進む' })).toHaveAttribute('href', '/home');
  });
});
