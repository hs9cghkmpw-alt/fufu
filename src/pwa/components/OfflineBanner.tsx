import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="offline-banner" role="status">
      オフラインです。正式な申請・承認・変更はできません。
    </div>
  );
}
