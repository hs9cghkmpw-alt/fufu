export function HomePage() {
  return (
    <section className="page" aria-labelledby="home-title">
      <p className="eyebrow">ふたりの現在地</p>
      <h1 id="home-title">ホーム</h1>
      <div className="status-grid">
        <article className="status-card accent">
          <strong>あなたの対応</strong>
          <span>0件</span>
          <small>対応が必要な申請はありません</small>
        </article>
        <article className="status-card">
          <strong>近日の予定</strong>
          <span>0件</span>
          <small>合意済みの予定が表示されます</small>
        </article>
      </div>
      <button className="primary-button" type="button" disabled>
        ＋ 申請を作る
      </button>
    </section>
  );
}
