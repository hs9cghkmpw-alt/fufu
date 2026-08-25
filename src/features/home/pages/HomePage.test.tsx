import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('../hooks/useHomeData', () => ({
  useHomeData: () => ({
    data: {
      actionRequired: [],
      overdue: [],
      upcoming: [],
      awaitingPartner: [],
      discussions: [],
      recentAgreements: []
    },
    isLoading: false,
    error: ''
  })
}));

describe('HomePage', () => {
  it('prioritizes the current actor area', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'ホーム' })).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'あなたの対応が必要',
      '未実行・期限超過',
      '今日・近日の予定',
      '相手の回答待ち',
      '話し合い予定',
      '最近の合意'
    ]);
  });
});
