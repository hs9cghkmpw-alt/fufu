import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HistoryPage } from './HistoryPage';

vi.mock('../services/historyService', () => ({
  getHistoryData: vi.fn().mockResolvedValue({ requests: [], completedAgreements: [] })
}));

describe('HistoryPage', () => {
  it('shows request results and completed agreement sections', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: '履歴' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '申請の結果' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '実行済みの合意' })).toBeVisible();
  });
});
