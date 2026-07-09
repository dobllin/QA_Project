'use client'

import { useState } from 'react'
import Link from 'next/link'

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

type InstitusiStats = {
  santriCount: number
  kategoriCount: number
  pengajarCount: number
  progresBulanIni: number
  avgPoin: number
}

type InstitusiWithStats = {
  id: number
  nama: string
  jenis: string
  stats: InstitusiStats
  santri: Santri[]
}

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

export default function SuperSantriClient({
  institusiList,
}: {
  institusiList: InstitusiWithStats[]
}) {
  const [activeInstitusiId, setActiveInstitusiId] = useState<number | null>(
    null
  )

  const visible =
    activeInstitusiId === null
      ? institusiList
      : institusiList.filter((i) => i.id === activeInstitusiId)

  const totalSantri = institusiList.reduce(
    (sum, i) => sum + i.stats.santriCount,
    0
  )

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Pantau
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Semua santri
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Dashboard santri per institusi. Data ini diinput oleh admin masing-masing.
        </p>
      </div>

      <div className="divider-double mb-8" />

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveInstitusiId(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeInstitusiId === null
              ? 'bg-forest-700 text-cream-50'
              : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
          }`}
        >
          Semua ({totalSantri})
        </button>
        {institusiList.map((i) => (
          <button
            key={i.id}
            onClick={() => setActiveInstitusiId(i.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeInstitusiId === i.id
                ? 'bg-forest-700 text-cream-50'
                : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
            }`}
          >
            {i.nama} ({i.stats.santriCount})
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {visible.map((inst) => (
          <InstitusiDashboard key={inst.id} institusi={inst} />
        ))}
      </div>
    </div>
  )
}

function InstitusiDashboard({ institusi }: { institusi: InstitusiWithStats }) {
  const { stats } = institusi
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
    <section>
      <div className="mb-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
          {jenisLabel[institusi.jenis] ?? institusi.jenis}
        </div>
        <h2 className="font-display text-3xl text-forest-800">
          {institusi.nama}
        </h2>
      </div>

      {/* Stats grid - poin hanya untuk Pondok */}
      <div
        className={`grid grid-cols-2 ${
          isPondok ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
        } gap-3 mb-6`}
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

      <div>
        <div className="text-[10px] font-medium uppercase tracking-widest text-ink-500 mb-3">
          Daftar santri
        </div>

        {institusi.santri.length === 0 ? (
          <div className="bg-cream-50 border border-line rounded-lg p-6 text-center">
            <p className="text-sm text-ink-500">
              Belum ada santri terdaftar di institusi ini.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {institusi.santri.map((s) => {
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
                  href={`/institusi/${s.institusi_id}/santri/${s.id}`}
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
                  {/* Poin badge cuma untuk Pondok */}
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
    </section>
  )
}