/**
 * Style reminder — Zanzibar Civic Ledger: compact voice-shield symbol paired
 * with assured civic typography; never over-decorate the brand lockup.
 */
import { APP_MARK_URL } from "@/lib/demo-data";

type BrandMarkProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark ${inverse ? "brand-mark--inverse" : ""}`}>
      <img className="brand-mark__icon" src={APP_MARK_URL} alt="Sauti Yako" />
      {!compact && (
        <div className="brand-mark__text">
          <span>SAUTI YAKO</span>
          <small>CASE INTELLIGENCE</small>
        </div>
      )}
    </div>
  );
}
