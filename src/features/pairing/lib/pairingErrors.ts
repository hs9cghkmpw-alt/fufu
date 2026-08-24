const messages: Record<string, string> = {
  already_paired: 'すでに別の夫婦スペースに参加しています。',
  couple_full: 'この夫婦スペースにはすでに2人が参加しています。',
  self_invitation: '自分が発行した招待コードでは参加できません。',
  invalid_invitation: '招待コードが正しくありません。',
  invitation_used: 'この招待コードはすでに使用されています。',
  invitation_revoked: 'この招待コードは取り消されています。',
  invitation_expired: 'この招待コードの有効期限は切れています。',
  invitation_not_found: '有効な招待が見つかりません。',
  couple_not_found: '夫婦スペースが見つかりません。'
};

export function mapPairingError(error: { message: string } | null): string {
  if (!error) return '';
  return messages[error.message] ?? '処理を完了できませんでした。もう一度お試しください。';
}
