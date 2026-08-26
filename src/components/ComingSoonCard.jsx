// Small reusable stub for tabs/widgets whose data still depends on the
// pre-migration Supabase setup (Phase 2) - icon + title + a note that it's
// coming back in a future update, styled as a reduced-opacity glass-card.
export default function ComingSoonCard({ title, icon = 'fa-hourglass-half' }) {
  return (
    <div className="card glass-card coming-soon-card">
      <div className="coming-soon-icon">
        <i className={`fa-solid ${icon}`} />
      </div>
      <h3>{title}</h3>
      <p>Coming back in a future update</p>
    </div>
  );
}
