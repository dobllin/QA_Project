'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSantri } from './actions'

type Santri = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  tahun_masuk: number | null
  poin: number | null
  institusi_id: number
  kategoriCount: number
  ustadzCount: number
}

type Stats = {
  santriCount: number
  kategoriCount: number
  pengajarCount: number
  progresBulanIni: number
  avgPoin: number
}

type Institusi = {
  id: number
  nama: string
  jenis: string
}

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

export default function SantriClient({
  santri,
  stats,
  institusi,
  institusiId,
  isAdmin,
}: {
  santri: Santri[]
  stats: Stats
  institusi: Institusi
  institusiId: number
  isAdmin: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const isPondok = institusi.jenis === 'PONPES'

  const avgPoinClass =
    stats.avgPoin >= 100
      ? 'text-success-500'
      : stats.avgPoin >= 80
      ? 'text-forest-800'
      : stats.avgPoin >= 50
      ? 'text-copper-600'
      : 'text-error-500'

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
            {jenisLabel[institusi.jenis] ?? 'Kelola'}
          </div>
          <h1 className="font-display text-5xl text-forest-800 leading-none">
            {isAdmin ? 'Semua santri' : 'Santri saya'}
          </h1>
          <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
            Data santri di {institusi.nama}. Klik nama untuk lihat detail dan input setoran.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 bg-forest-700 hover:bg-forest-800 text-cream-50 text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            {showForm ? 'Batal' : 'Tambah santri'}
          </button>
        )}
      </div>

      <div className="divider-double mb-8" />

      <div
        className={`grid grid-cols-2 ${
          isPondok ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
        } gap-3 mb-8`}
      >
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Santri
          </div>
          <div className="font-display text-2xl text-forest-800">
            {stats.santriCount}
          </div>
        </div>
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Kategori
          </div>
          <div className="font-display text-2xl text-forest-800">
            {stats.kategoriCount}
          </div>
        </div>
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Pengajar
          </div>
          <div className="font-display text-2xl text-forest-800">
            {stats.pengajarCount}
          </div>
        </div>
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Progres bulan ini
          </div>
          <div className="font-display text-2xl text-forest-800">
            {stats.progresBulanIni}
          </div>
        </div>
        {isPondok && (
          <div className="bg-cream-50 border border-line rounded-xl p-4">
            <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
              Rata-rata poin
            </div>
            <div className={`font-display text-2xl ${avgPoinClass}`}>
              {stats.avgPoin}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <SantriForm
          institusiId={institusiId}
          onDone={() => setShowForm(false)}
        />
      )}

      <div>
        <div className="text-[10px] font-medium uppercase tracking-widest text-ink-500 mb-3">
          Daftar santri
        </div>

        {santri.length === 0 ? (
          <div className="bg-cream-50 border border-line rounded-lg p-6 text-center">
            <p className="text-sm text-ink-500">
              {isAdmin
                ? 'Belum ada santri. Klik "Tambah santri" untuk memulai.'
                : 'Belum ada santri terdaftar di institusi ini.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {santri.map((s) => {
              const poin = s.poin ?? 100
              const poinClass =
                poin >= 100
                  ? 'text-success-500 bg-success-500/10 border-success-500/30'
                  : poin >= 50
                  ? 'text-copper-600 bg-copper-500/10 border-copper-500/30'
                  : 'text-error-500 bg-error-500/10 border-error-500/30'

              return (
                <Link
                  key={s.id}
                  href={`/institusi/${institusiId}/santri/${s.id}`}
                  className="group flex items-center justify-between gap-4 bg-cream-50 border border-line rounded-lg p-4 hover:border-forest-700 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-forest-800 group-hover:text-forest-600 transition">
                      {s.nama}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-500 mt-0.5">
                      {s.kelas && <span>Kelas {s.kelas}</span>}
                      {s.halaqoh && <span>Halaqoh {s.halaqoh}</span>}
                      {s.tahun_masuk && <span>Masuk {s.tahun_masuk}</span>}
                      {s.kategoriCount > 0 && (
                        <span>
                          {s.kategoriCount} kategori · {s.ustadzCount} pengajar
                        </span>
                      )}
                    </div>
                  </div>
                  {isPondok && (
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${poinClass}`}
                    >
                      {poin} poin
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SantriForm({
  institusiId,
  onDone,
}: {
  institusiId: number
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-6 mb-6">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
        Baru
      </div>
      <h2 className="font-display text-2xl text-forest-800 mb-5">
        Tambah santri
      </h2>

      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null)
            const result = await createSantri(institusiId, fd)
            if (result?.error) setError(result.error)
            else onDone()
          })
        }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Nama lengkap
          </label>
          <input
            name="nama"
            required
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="Muhammad Fauzi"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Kelas
          </label>
          <input
            name="kelas"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="1 SMP / TK B / Aliyah 2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Halaqoh
          </label>
          <input
            name="halaqoh"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="Halaqoh A / Halaqoh Ust. Ahmad"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Tahun masuk
          </label>
          <input
            name="tahun_masuk"
            type="number"
            min="2000"
            max="2100"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="2024"
          />
        </div>

        {error && (
          <div className="sm:col-span-2 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan santri'}
          </button>
        </div>
      </form>
    </div>
  )
}