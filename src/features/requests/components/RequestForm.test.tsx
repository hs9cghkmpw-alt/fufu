import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequestForm } from './RequestForm';

describe('RequestForm', () => {
  it('validates required input before sending', async () => {
    const submit = vi.fn();
    render(<RequestForm onSubmit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: '相手に申請を送る' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('タイトルを入力してください。');
    expect(submit).not.toHaveBeenCalled();
  });

  it('sends normalized form data', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<RequestForm onSubmit={submit} />);
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '掃除機を買いたい' } });
    fireEvent.change(screen.getByLabelText('金額（任意・円）'), { target: { value: '12000' } });
    fireEvent.change(screen.getByLabelText('金額種別'), { target: { value: 'one_time' } });
    fireEvent.click(screen.getByRole('button', { name: '相手に申請を送る' }));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ title: '掃除機を買いたい', amount: 12000 })
    );
  });
});
