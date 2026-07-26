export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-3 w-32 bg-cream-200 rounded" />
      <div>
        <div className="h-3 w-16 bg-cream-200 rounded mb-3" />
        <div className="h-12 w-72 bg-cream-200 rounded" />
        <div className="h-3 w-56 bg-cream-200/70 rounded mt-4" />
      </div>
      <div className="h-px bg-line" />
      <div className="bg-cream-50 border border-line rounded-xl p-6 space-y-4">
        <div className="h-4 w-32 bg-cream-200 rounded" />
        <div className="h-10 w-full bg-cream-200/60 rounded" />
        <div className="h-10 w-full bg-cream-200/60 rounded" />
        <div className="h-10 w-40 bg-cream-200 rounded" />
      </div>
    </div>
  )
}