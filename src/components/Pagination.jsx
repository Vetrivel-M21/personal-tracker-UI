// Simple prev/next pagination control (matches the old app's ledger-pagination look).
export default function Pagination({ page, totalPages, onPrev, onNext }) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onPrev} disabled={page <= 1}>
        Previous
      </button>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Page {page}{totalPages ? ` of ${totalPages}` : ''}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onNext} disabled={totalPages ? page >= totalPages : false}>
        Next
      </button>
    </div>
  );
}
