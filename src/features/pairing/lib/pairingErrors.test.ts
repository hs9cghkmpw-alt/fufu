import { describe, expect, it } from 'vitest';
import { mapPairingError } from './pairingErrors';

describe('mapPairingError', () => {
  it('maps safe domain errors', () => {
    expect(mapPairingError({ message: 'couple_full' })).toBe(
      'この夫婦スペースにはすでに2人が参加しています。'
    );
  });

  it('does not expose unknown database details', () => {
    expect(mapPairingError({ message: 'internal detail' })).toBe(
      '処理を完了できませんでした。もう一度お試しください。'
    );
  });
});
