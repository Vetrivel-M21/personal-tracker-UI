// Shimmering placeholder block used in place of plain "Loading..." text
// while a tab's initial data fetch is in flight.
export function Skeleton({ height = 20, className = '', style }) {
  return <div className={`skeleton ${className}`} style={{ height, ...style }} />;
}

export function SkeletonGroup({ count = 3, height = 52, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} height={height} />)}
    </div>
  );
}
