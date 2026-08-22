/**
 * Style reminder — Zanzibar Civic Ledger: metrics are crisp evidence tiles,
 * with tabular emphasis and one controlled signal colour per card.
 */
type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: string;
};

export function MetricCard({ label, value, detail, trend, tone }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__rule" />
      <p>{label}</p>
      <strong>{value}</strong>
      <div><span>{detail}</span><em>{trend}</em></div>
    </article>
  );
}
