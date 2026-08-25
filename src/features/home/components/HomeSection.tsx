import type { ReactNode } from 'react';

export function HomeSection({
  title,
  emptyMessage,
  children,
  count
}: {
  title: string;
  emptyMessage: string;
  children: ReactNode;
  count: number;
}) {
  return (
    <section className="home-section" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <span>{count}件</span>
      </header>
      {count ? <div className="request-list">{children}</div> : <p>{emptyMessage}</p>}
    </section>
  );
}
