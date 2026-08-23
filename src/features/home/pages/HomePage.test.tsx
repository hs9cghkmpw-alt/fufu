import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('prioritizes the current actor area', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'ホーム' })).toBeInTheDocument();
    expect(screen.getByText('あなたの対応')).toBeInTheDocument();
  });
});
