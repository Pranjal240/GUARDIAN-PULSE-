export default function SkeletonCard({ height = 'h-32' }: { height?: string }) {
  return (
    <div className={`card ${height} shimmer`} />
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 rounded-full shimmer flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 shimmer rounded w-3/4" />
        <div className="h-2.5 shimmer rounded w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 shimmer rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
