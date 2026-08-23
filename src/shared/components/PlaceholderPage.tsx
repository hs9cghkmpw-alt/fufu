interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="page" aria-labelledby="page-title">
      <p className="eyebrow">Sprint 0</p>
      <h1 id="page-title">{title}</h1>
      <div className="placeholder-card">
        <span className="placeholder-icon" aria-hidden="true">
          ♡
        </span>
        <p>{description}</p>
        <small>業務機能は次のSprintから実装します。</small>
      </div>
    </section>
  );
}
