import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <aside className="update-prompt" role="status">
      <span>新しいバージョンがあります。</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        更新する
      </button>
    </aside>
  );
}
