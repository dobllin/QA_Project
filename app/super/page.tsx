import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function SuperOverviewPage() {
  const supabase = await createClient()

  // Ambil counts pararel
  const [
    { count: countInstitusi },
    { count: countPengguna },
    { count: countSantri },
    { count: countProgres },
  ] = await Promise.all([
    supabase.from('institusi').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('santri').select('*', { count: 'exact', head: true }),
    supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .gte(
        'tanggal',
        new Date(new Date().setDate(1)).toISOString().split('T')[0]
      ),
  ])

  const stats = [
    { label: 'Institusi aktif', value: countInstitusi ?? 0, href: '/super/institusi' },
    { label: 'Pengguna terdaftar', value: countPengguna ?? 0, href: '/super/pengguna' },
    { label: 'Santri', value: countSantri ?? 0, href: null },
    { label: 'Progres bulan ini', value: countProgres ?? 0, href: null },
  ]

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Ringkasan
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Sistem sekarang
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Ringkasan singkat aktivitas dan data terdaftar di seluruh institusi.
        </p>
      </div>

      <div className="divider-double mb-8" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {stats.map((s) =>
          s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="group bg-cream-50 border border-line rounded-xl p-5 hover:border-forest-700 transition"
            >
              <div className="text-xs text-ink-500 mb-2">{s.label}</div>
              <div className="font-display text-3xl text-forest-800 group-hover:text-forest-600 transition">
                {s.value}
              </div>
            </Link>
          ) : (
            <div
              key={s.label}
              className="bg-cream-50 border border-line rounded-xl p-5"
            >
              <div className="text-xs text-ink-500 mb-2">{s.label}</div>
              <div className="font-display text-3xl text-forest-800">
                {s.value}
              </div>
            </div>
          )
        )}
      </div>

      <div>
        <h2 className="font-display text-2xl text-forest-800 mb-4">
          Tindakan cepat
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/super/pengguna"
            className="bg-cream-50 border border-line rounded-xl p-5 hover:border-forest-700 transition"
          >
            <div className="font-medium text-forest-800 mb-1">
              Tambah pengguna baru
            </div>
            <div className="text-sm text-ink-500">
              Buat akun ustadz atau admin institusi
            </div>
          </Link>
          <Link
            href="/super/institusi"
            className="bg-cream-50 border border-line rounded-xl p-5 hover:border-forest-700 transition"
          >
            <div className="font-medium text-forest-800 mb-1">
              Kelola institusi
            </div>
            <div className="text-sm text-ink-500">
              Lihat RA, TPQ, dan Pondok Pesantren
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}