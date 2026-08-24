export default function Loading() {
  return (
    <main>
      <h1>MyInvest</h1>
      <p className="subtitle">A 股研究工具</p>
      <section className="panel" aria-live="polite">
        <span className="label">MyInvest 正在获取最新研究数据…</span>
      </section>
    </main>
  );
}
