// Muncul otomatis saat halaman di dalam institusi sedang dimuat.
// Tanpa ini, layar diam sampai data siap — bikin TERASA lama walau cepat.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Judul */}
      <div>
        <div className="h-3 w-24 bg-cream-200 rounded mb-3" />
        <div className="h-10 w-64 bg-cream-200 rounded" />
        <div className="h-3 w-80 bg-cream-200/70 rounded mt-4" />
      </div>

      <div className="h-px bg-line" />

      {/* Kartu metrik */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-cream-50 border border-line rounded-xl p-4">
            <div className="h-2.5 w-16 bg-cream-200 rounded mb-3" />
            <div className="h-8 w-12 bg-cream-200 rounded" />
          </div>
        ))}
      </div>

      {/* Daftar */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-cream-50 border border-line rounded-xl p-5">
            <div className="h-4 w-40 bg-cream-200 rounded mb-2" />
            <div className="h-3 w-24 bg-cream-200/70 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}