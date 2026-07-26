export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="animate-pulse w-full max-w-2xl space-y-4">
        <div className="h-10 w-64 bg-cream-200 rounded mx-auto" />
        <div className="h-24 bg-cream-50 border border-line rounded-xl" />
        <div className="h-24 bg-cream-50 border border-line rounded-xl" />
      </div>
    </div>
  )
}