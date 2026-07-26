export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-56 bg-cream-200 rounded" />
      <div className="h-px bg-line" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-cream-50 border border-line rounded-xl p-4">
            <div className="h-2.5 w-16 bg-cream-200 rounded mb-3" />
            <div className="h-8 w-12 bg-cream-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}