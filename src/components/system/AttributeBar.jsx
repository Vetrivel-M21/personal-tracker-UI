// One row of the character-sheet Attributes panel. `value` is a 0-100 score
// already computed by utils/attributes.js from real streak/learning/workout data.
export default function AttributeBar({ code, label, icon, value, color, glow }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="attribute-bar">
      <div className="attribute-bar-header">
        <span className="attribute-bar-code" style={{ color }}>
          <i className={`fa-solid ${icon}`} /> {code}
        </span>
        <span className="attribute-bar-label">{label}</span>
        <span className="attribute-bar-value" style={{ color }}>{pct}</span>
      </div>
      <div className="attribute-bar-track">
        <div
          className="attribute-bar-fill"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${glow}` }}
        />
      </div>
    </div>
  );
}
