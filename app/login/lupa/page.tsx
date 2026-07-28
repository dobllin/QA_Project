import Link from 'next/link'
import { kirimResetPassword } from '../actions'

export default async function LupaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const params = await searchParams
  const error = params.error
  const terkirim = params.sent === '1'

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
            Reset akses
          </div>
          <h1 className="font-display text-4xl text-forest-800 leading-none">
            Lupa Password
          </h1>
        </div>

        <div className="divider-double mb-8" />

        <div className="bg-cream-50 border border-line rounded-2xl p-7">
          {terkirim ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-success-500/10 border border-success-500/30 rounded-lg text-sm text-success-500">
                Kalau email itu terdaftar, kami sudah mengirim link untuk
                mengatur ulang password. Cek kotak masuk{' '}
                <span className="font-medium">dan folder Spam</span>.
              </div>
              <p className="text-xs text-ink-500">
                Link berlaku sementara. Kalau tidak ada, tunggu beberapa menit
                lalu coba lagi.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm text-forest-700 hover:underline"
              >
                ← Kembali ke login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-500 mb-5 leading-relaxed">
                Masukkan email akunmu. Kami kirim link untuk membuat password
                baru.
              </p>

              {error && (
                <div className="mb-5 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
                  {decodeURIComponent(error)}
                </div>
              )}

              <form className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-ink-700 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2.5 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 focus:bg-cream-50 transition"
                    placeholder="email@contoh.com"
                  />
                </div>

                <button
                  formAction={kirimResetPassword}
                  className="w-full bg-forest-700 hover:bg-forest-800 text-cream-50 text-sm font-medium py-2.5 rounded-lg transition mt-2"
                >
                  Kirim link reset
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="text-xs text-forest-700 hover:underline"
                >
                  ← Kembali ke login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}