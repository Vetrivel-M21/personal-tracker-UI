// Shared stat-card primitive - extracted from the markup Dashboard/Community
// were each hand-rolling (card glass-card stat-card > card-icon > stat-info).
export default function StatCard({
  icon,
  iconBg = 'bg-indigo-alpha',
  iconStyle,
  label,
  value,
  valueStyle,
  sublabel,
  cardStyle,
}) {
  return (
    <div className="card glass-card stat-card" style={cardStyle}>
      <div className={`card-icon ${iconBg}`} style={iconStyle}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="stat-info" style={{ flex: 1 }}>
        <h3>{label}</h3>
        <div className="stat-val" style={valueStyle}>{value}</div>
        {sublabel && <p className="stat-desc">{sublabel}</p>}
      </div>
    </div>
  );
}
