import { aturUlangPassword } from '../actions'

export default async function AturUlangPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
            Reset akses
          </div>
          <h1 className="font-display text-4xl text-forest-800 leading-none">
            Password Baru
          </h1>
        </div>

        <div className="divider-double mb-8" />

        <div className="bg-cream-50 border border-line rounded-2xl p-7">
          <p className="text-sm text-ink-500 mb-5 leading-relaxed">
            Buat password baru untuk akunmu. Minimal 6 karakter.
          </p>

          {error && (
            <div className="mb-5 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
              {decodeURIComponent(error)}
            </div>
          )}

          <form className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-ink-700 mb-1.5"
              >
                Password baru
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 focus:bg-cream-50 transition"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <button
              formAction={aturUlangPassword}
              className="w-full bg-forest-700 hover:bg-forest-800 text-cream-50 text-sm font-medium py-2.5 rounded-lg transition mt-2"
            >
              Simpan password baru
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-500 mt-6">
          Halaman ini terbuka lewat link di email. Kalau kamu buka langsung
          tanpa link, password tidak bisa diubah.
        </p>
      </div>
    </div>
  )
}