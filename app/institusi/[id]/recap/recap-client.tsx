'use client'

import { useState } from 'react'
import Link from 'next/link'

type Institusi = { id: number; nama: string; jenis: string }

type Log = {
  id: string
  jenis: 'kesalahan_ringan' | 'kesalahan_sedang' | 'kesalahan_parah' | 'kebaikan'
  nilai_perubahan: number
  keterangan: string | null
  tanggal: string
  ustadz_id: string
  santri_id: string
  created_at: string
  santri: { id: string; nama: string; kelas: string | null; halaqoh: string | null } | null
  profiles: { nama: string } | null
}

const jenisLabel: Record<string, string> = {
  kebaikan: 'Kebaikan',
  kesalahan_ringan: 'Kesalahan ringan',
  kesalahan_sedang: 'Kesalahan sedang',
  kesalahan_parah: 'Kesalahan parah',
}

const jenisLabelInstitusi: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

const formatTanggal = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function RecapClient({
  institusi,
  logs,
  isAdmin,
}: {
  institusi: Institusi
  logs: Log[]
  isAdmin: boolean
}) {
  const [filterJenis, setFilterJenis] = useState<string | null>(null)

  const filtered = filterJenis
    ? logs.filter((l) => l.jenis === filterJenis)
    : logs

  // Stats
  const totalKebaikan = logs.filter((l) => l.jenis === 'kebaikan').length
  const totalKesalahan = logs.filter((l) =>
    l.jenis.startsWith('kesalahan_')
  ).length
  const sumChange = logs.reduce((sum, l) => sum + l.nilai_perubahan, 0)

  // Group by santri (top 5 most active)
  const santriMap = new Map<
    string,
    { nama: string; count: number; sum: number }
  >()
  for (const l of logs) {
    const key = l.santri_id
    if (!santriMap.has(key)) {
      santriMap.set(key, {
        nama: l.santri?.nama ?? '(unknown)',
        count: 0,
        sum: 0,
      })
    }
    const entry = santriMap.get(key)!
    entry.count++
    entry.sum += l.nilai_perubahan
  }
  const topSantri = Array.from(santriMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          {jenisLabelInstitusi[institusi.jenis] ?? institusi.jenis} · Recap
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Recap poin santri
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          {isAdmin
            ? 'Riwayat perubahan poin santri di institusi ini beserta keterangannya.'
            : 'Riwayat perubahan poin yang kamu input untuk santri ampuanmu.'}
        </p>
      </div>

      <div className="divider-double mb-8" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Total kebaikan
          </div>
          <div className="font-display text-2xl text-success-500">
            {totalKebaikan}
          </div>
        </div>
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Total kesalahan
          </div>
          <div className="font-display text-2xl text-error-500">
            {totalKesalahan}
          </div>
        </div>
        <div className="bg-cream-50 border border-line rounded-xl p-4">
          <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
            Total perubahan poin
          </div>
          <div
            className={`font-display text-2xl ${
              sumChange >= 0 ? 'text-success-500' : 'text-error-500'
            }`}
          >
            {sumChange >= 0 ? '+' : ''}
            {sumChange}
          </div>
        </div>
      </div>

      {topSantri.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl text-forest-800 mb-3">
            Santri paling banyak dicatat
          </h2>
          <div className="grid gap-2">
            {topSantri.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 bg-cream-50 border border-line rounded-lg p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-forest-800">
                    {s.nama}
                  </div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {s.count} entri
                  </div>
                </div>
                <span
                  className={`text-sm font-display ${
                    s.sum >= 0 ? 'text-success-500' : 'text-error-500'
                  }`}
                >
                  {s.sum >= 0 ? '+' : ''}
                  {s.sum}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterJenis(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterJenis === null
                ? 'bg-forest-700 text-cream-50'
                : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
            }`}
          >
            Semua ({logs.length})
          </button>
          <button
            onClick={() => setFilterJenis('kebaikan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterJenis === 'kebaikan'
                ? 'bg-forest-700 text-cream-50'
                : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
            }`}
          >
            Kebaikan
          </button>
          <button
            onClick={() => setFilterJenis('kesalahan_ringan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterJenis === 'kesalahan_ringan'
                ? 'bg-forest-700 text-cream-50'
                : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
            }`}
          >
            Kesalahan ringan
          </button>
          <button
            onClick={() => setFilterJenis('kesalahan_sedang')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterJenis === 'kesalahan_sedang'
                ? 'bg-forest-700 text-cream-50'
                : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
            }`}
          >
            Kesalahan sedang
          </button>
          <button
            onClick={() => setFilterJenis('kesalahan_parah')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterJenis === 'kesalahan_parah'
                ? 'bg-forest-700 text-cream-50'
                : 'bg-cream-50 border border-line text-ink-700 hover:border-forest-700'
            }`}
          >
            Kesalahan parah
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl text-forest-800 mb-4">
          Riwayat perubahan ({filtered.length})
        </h2>

        {filtered.length === 0 ? (
          <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
            <p className="text-sm text-ink-500">
              Belum ada perubahan poin yang tercatat.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const isPositif = log.nilai_perubahan > 0
              return (
                <div
                  key={log.id}
                  className="bg-cream-50 border border-line rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link
                          href={`/institusi/${institusi.id}/santri/${log.santri_id}`}
                          className="text-sm font-medium text-forest-800 hover:text-forest-600 transition"
                        >
                          {log.santri?.nama ?? '(unknown)'}
                        </Link>
                        <span
                          className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isPositif
                              ? 'bg-success-500/10 text-success-500 border-success-500/30'
                              : log.jenis === 'kesalahan_parah'
                              ? 'bg-error-500/10 text-error-500 border-error-500/30'
                              : 'bg-copper-500/10 text-copper-600 border-copper-500/30'
                          }`}
                        >
                          {jenisLabel[log.jenis]}
                        </span>
                      </div>
                      {log.santri && (log.santri.kelas || log.santri.halaqoh) && (
                        <div className="text-xs text-ink-500 mb-1">
                          {log.santri.kelas && `Kelas ${log.santri.kelas}`}
                          {log.santri.kelas && log.santri.halaqoh && ' · '}
                          {log.santri.halaqoh && `Halaqoh ${log.santri.halaqoh}`}
                        </div>
                      )}
                      {log.keterangan && (
                        <div className="text-sm text-ink-700 mt-2 italic">
                          &ldquo;{log.keterangan}&rdquo;
                        </div>
                      )}
                      <div className="text-xs text-ink-400 mt-2">
                        {formatTanggal(log.tanggal)}
                        {log.profiles?.nama && ` · ${log.profiles.nama}`}
                      </div>
                    </div>
                    <div
                      className={`font-display text-xl shrink-0 ${
                        isPositif ? 'text-success-500' : 'text-error-500'
                      }`}
                    >
                      {isPositif ? '+' : ''}
                      {log.nilai_perubahan}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}