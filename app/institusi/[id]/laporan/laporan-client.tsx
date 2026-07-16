'use client'

// ============================================================
// FILE: app/institusi/[id]/laporan/laporan-client.tsx
// ============================================================

import { useRouter } from 'next/navigation'
import Link from 'next/link'

type CustomField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

type Santri = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  tahun_masuk: number | null
  poin: number | null
}

type ProgresRow = {
  id: string
  tanggal: string
  kategori_id: number
  jenis_setoran: string | null
  lancar: boolean | null
  surah_mulai: string | null
  ayat_mulai: number | null
  surah_selesai: string | null
  ayat_selesai: number | null
  kitab_nama: string | null
  bab: string | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  absen: boolean | null
  kendala: string | null
  iqro_jilid: number | null
  iqro_halaman: number | null
  kualitas: string | null
  catatan: string | null
  custom_values: Record<string, string | number | null> | null
}

type Kategori = {
  id: number
  nama: string
  customFields: CustomField[]
  progres: ProgresRow[]
}

type PoinLog = {
  id: string
  jenis: string
  nilai_perubahan: number
  keterangan: string | null
  tanggal: string
}

type SantriData = {
  santri: Santri
  kategoriList: Kategori[]
  totalSetoran: number
  totalWithAbsen: number
  totalHadir: number
  totalTidakHadir: number
  poinLog: PoinLog[]
  poinAwal: number
  poinAkhir: number
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

const kualitasLabel: Record<string, string> = {
  lancar: 'Lancar',
  cukup: 'Cukup',
  ulang: 'Perlu diulang',
  kurang: 'Kurang',
  sedang: 'Sedang',
  sangat_bagus: 'Sangat bagus',
}

const jenisSetoranLabel: Record<string, string> = {
  hafalan_baru: 'Hafalan baru',
  setoran: 'Setoran',
  murojaah: 'Murojaah',
}

const poinJenisLabel: Record<string, string> = {
  kebaikan: 'Kebaikan',
  kesalahan_ringan: 'Kesalahan ringan',
  kesalahan_sedang: 'Kesalahan sedang',
  kesalahan_parah: 'Kesalahan parah',
}

function formatTanggal(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMinggu(minggu: string, start: string, end: string) {
  const match = minggu.match(/^(\d{4})-W(\d{1,2})$/)
  const weekNum = match ? parseInt(match[2]) : 0
  const startD = new Date(start).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
  const endD = new Date(end).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `Minggu ke-${weekNum} (${startD} – ${endD})`
}

export default function LaporanClient({
  institusi,
  institusiId,
  santriList,
  currentSantriId,
  currentMinggu,
  weekStart,
  weekEnd,
  santriData,
}: {
  institusi: Institusi
  institusiId: number
  santriList: Santri[]
  currentSantriId: string | null
  currentMinggu: string
  weekStart: string
  weekEnd: string
  santriData: SantriData | null
}) {
  const router = useRouter()

  const updateQuery = (santri: string, minggu: string) => {
    const params = new URLSearchParams()
    if (santri) params.set('santri', santri)
    if (minggu) params.set('minggu', minggu)
    router.push(`/institusi/${institusiId}/laporan?${params.toString()}`)
  }

  return (
    <div>
      {/* PICKER — hide waktu print */}
      <div className="mb-8 print:hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
              {jenisLabel[institusi.jenis] ?? 'Kelola'}
            </div>
            <h1 className="font-display text-5xl text-forest-800 leading-none">
              Laporan
            </h1>
            <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
              Cetak rapor mingguan santri buat wali murid. Pilih santri dan
              minggu dulu.
            </p>
          </div>
          <Link
            href={`/institusi/${institusiId}/target`}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm text-forest-700 hover:text-forest-800 border border-forest-700/30 hover:border-forest-700 rounded-lg px-4 py-2 transition"
          >
            → Lihat Target Ustadz
          </Link>
        </div>

        <div className="divider-double mb-6 mt-6" />

        <div className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end bg-cream-50 border border-line rounded-xl p-5">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Santri
            </label>
            <select
              value={currentSantriId ?? ''}
              onChange={(e) => updateQuery(e.target.value, currentMinggu)}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            >
              <option value="">— Pilih santri —</option>
              {santriList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                  {s.kelas ? ` · ${s.kelas}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Minggu
            </label>
            <input
              type="week"
              value={currentMinggu}
              onChange={(e) =>
                updateQuery(currentSantriId ?? '', e.target.value)
              }
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <button
            onClick={() => window.print()}
            disabled={!santriData}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-40 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition h-fit"
          >
            🖨 Cetak
          </button>
        </div>
      </div>

      {/* REPORT */}
      {!santriData ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center print:hidden">
          <p className="text-sm text-ink-500">
            Pilih santri di atas buat lihat laporan.
          </p>
        </div>
      ) : (
        <div className="print-page">
          {/* Header cetak */}
          <div className="text-center mb-8 pb-6 border-b-2 border-forest-800">
            <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-copper-600 mb-2">
              {jenisLabel[institusi.jenis] ?? ''}
            </div>
            <div className="font-display text-3xl text-forest-800">
              {institusi.nama}
            </div>
            <div className="text-lg mt-2 text-ink-700">
              Laporan {formatMinggu(currentMinggu, weekStart, weekEnd)}
            </div>
          </div>

          {/* Info santri */}
          <div className="mb-6">
            <div className="text-[10px] font-medium uppercase tracking-widest text-copper-600 mb-2">
              Data Santri
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="text-ink-500">Nama: </span>
                <span className="font-medium text-forest-800">
                  {santriData.santri.nama}
                </span>
              </div>
              {santriData.santri.kelas && (
                <div>
                  <span className="text-ink-500">Kelas: </span>
                  <span className="text-ink-700">
                    {santriData.santri.kelas}
                  </span>
                </div>
              )}
              {santriData.santri.halaqoh && (
                <div>
                  <span className="text-ink-500">Halaqoh: </span>
                  <span className="text-ink-700">
                    {santriData.santri.halaqoh}
                  </span>
                </div>
              )}
              {santriData.santri.tahun_masuk && (
                <div>
                  <span className="text-ink-500">Tahun masuk: </span>
                  <span className="text-ink-700">
                    {santriData.santri.tahun_masuk}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ringkasan minggu */}
          <div className="mb-8 grid grid-cols-3 gap-3">
            <div className="border border-line rounded-lg p-4 text-center">
              <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                Total setoran
              </div>
              <div className="font-display text-2xl text-forest-800">
                {santriData.totalSetoran}
              </div>
            </div>
            <div className="border border-line rounded-lg p-4 text-center">
              <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                Kehadiran
              </div>
              <div className="font-display text-2xl text-forest-800">
                {santriData.totalWithAbsen > 0
                  ? Math.round(
                      (santriData.totalHadir / santriData.totalWithAbsen) * 100
                    )
                  : 0}
                %
              </div>
              <div className="text-[10px] text-ink-400 mt-0.5">
                {santriData.totalHadir}/{santriData.totalWithAbsen} hadir
              </div>
            </div>
            <div className="border border-line rounded-lg p-4 text-center">
              <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                Poin akhir
              </div>
              <div className="font-display text-2xl text-forest-800">
                {santriData.poinAkhir}
              </div>
              <div className="text-[10px] text-ink-400 mt-0.5">
                Awal minggu: {santriData.poinAwal}
              </div>
            </div>
          </div>

          {/* Rekap Poin */}
          {santriData.poinLog.length > 0 && (
            <div className="mb-10">
              <div className="mb-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-copper-600 mb-1">
                  Bagian 1
                </div>
                <h2 className="font-display text-2xl text-forest-800 pb-2 border-b-2 border-forest-800">
                  Poin Disiplin
                </h2>
              </div>
              <div className="space-y-1">
                {santriData.poinLog.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-baseline gap-3 text-sm py-1"
                  >
                    <div className="w-24 text-ink-500 text-xs shrink-0">
                      {formatTanggal(log.tanggal)}
                    </div>
                    <div
                      className={`w-12 font-medium text-right shrink-0 ${
                        log.nilai_perubahan > 0
                          ? 'text-success-500'
                          : 'text-error-500'
                      }`}
                    >
                      {log.nilai_perubahan > 0 ? '+' : ''}
                      {log.nilai_perubahan}
                    </div>
                    <div className="text-ink-700 w-32 shrink-0 text-xs">
                      {poinJenisLabel[log.jenis] ?? log.jenis}
                    </div>
                    <div className="text-ink-500 italic text-xs flex-1">
                      {log.keterangan ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rekap Setoran per kategori */}
          {santriData.kategoriList.length === 0 ? (
            <div className="text-center text-sm text-ink-500 italic py-8">
              Belum ada setoran tercatat di minggu ini.
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-copper-600 mb-1">
                  Bagian 2
                </div>
                <h2 className="font-display text-2xl text-forest-800 pb-2 border-b-2 border-forest-800">
                  Setoran & Progres Pembelajaran
                </h2>
              </div>

              {santriData.kategoriList.map((k, idx) => {
                const lancar = k.progres.filter(
                  (p) => p.lancar === true
                ).length
                const totalLancar = k.progres.filter(
                  (p) => p.lancar !== null
                ).length
                const nilaiCounts: Record<string, number> = {}
                for (const p of k.progres) {
                  if (p.kualitas) {
                    nilaiCounts[p.kualitas] =
                      (nilaiCounts[p.kualitas] ?? 0) + 1
                  }
                }

                return (
                  <div
                    key={k.id}
                    className={`mb-8 break-inside-avoid ${
                      idx > 0 ? 'pt-4' : ''
                    }`}
                  >
                    <div className="bg-forest-800 text-cream-50 px-4 py-3 rounded-t-lg">
                      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-copper-500 mb-1">
                        Kategori Pembelajaran
                      </div>
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <div className="font-display text-2xl uppercase tracking-wide">
                          {k.nama}
                        </div>
                        <div className="text-xs text-cream-100 font-medium">
                          {k.progres.length} setoran
                        </div>
                      </div>
                    </div>

                    <div className="border border-forest-800 border-t-0 px-4 py-3 bg-cream-50">
                      <div className="text-xs text-ink-700 flex flex-wrap gap-x-6 gap-y-1">
                        {totalLancar > 0 && (
                          <span>
                            <span className="text-ink-500">Kelancaran: </span>
                            <span className="font-medium text-forest-800">
                              {lancar}/{totalLancar} lancar (
                              {Math.round((lancar / totalLancar) * 100)}%)
                            </span>
                          </span>
                        )}
                        {Object.entries(nilaiCounts).length > 0 && (
                          <span>
                            <span className="text-ink-500">Rekap nilai: </span>
                            <span className="text-forest-800">
                              {Object.entries(nilaiCounts)
                                .map(
                                  ([kualitas, count]) =>
                                    `${count}× ${
                                      kualitasLabel[kualitas] ?? kualitas
                                    }`
                                )
                                .join(', ')}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <table className="w-full text-xs border-collapse border border-forest-800 border-t-0 rounded-b-lg">
                      <thead>
                        <tr className="bg-cream-100 border-b border-line text-ink-700 uppercase tracking-wider text-[9px]">
                          <th className="text-left py-2 px-3 w-20">Tanggal</th>
                          <th className="text-left py-2 px-3">Materi</th>
                          <th className="text-left py-2 px-3 w-24">Nilai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {k.progres.map((p) => (
                          <tr key={p.id} className="border-b border-line/40">
                            <td className="py-2 px-3 text-ink-600 align-top">
                              {new Date(p.tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </td>
                            <td className="py-2 px-3 align-top">
                              {renderMateri(p)}
                              {renderCustom(p, k.customFields)}
                              {p.catatan && (
                                <div className="text-ink-500 italic mt-0.5">
                                  {p.catatan}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 align-top text-ink-700">
                              {p.kualitas
                                ? kualitasLabel[p.kualitas] ?? p.kualitas
                                : '—'}
                              {p.lancar !== null && (
                                <div className="text-[10px] text-ink-500">
                                  {p.lancar ? 'Lancar' : 'Tidak lancar'}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: white !important;
          }
          .print-page {
            box-shadow: none !important;
          }
          nav,
          aside,
          .sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

function renderMateri(p: ProgresRow): React.ReactNode {
  const parts: string[] = []
  if (p.jenis_setoran) {
    parts.push(jenisSetoranLabel[p.jenis_setoran] ?? p.jenis_setoran)
  }
  if (p.surah_mulai || p.surah_selesai) {
    const mulai = [p.surah_mulai, p.ayat_mulai].filter(Boolean).join(':')
    const selesai = [p.surah_selesai, p.ayat_selesai].filter(Boolean).join(':')
    parts.push(`${mulai || '?'} → ${selesai || '?'}`)
  }
  if (p.kitab_nama) parts.push(p.kitab_nama)
  if (p.bab) parts.push(p.bab)
  if (p.halaman_mulai || p.halaman_selesai) {
    parts.push(`Hal ${p.halaman_mulai ?? '?'}–${p.halaman_selesai ?? '?'}`)
  }
  if (p.iqro_jilid) parts.push(`Jilid ${p.iqro_jilid}`)
  if (p.iqro_halaman) parts.push(`Hal ${p.iqro_halaman}`)

  return <div className="text-ink-700">{parts.join(' · ') || '—'}</div>
}

function renderCustom(
  p: ProgresRow,
  customFields: CustomField[]
): React.ReactNode {
  const entries = customFields
    .map((f) => ({
      label: f.label,
      value: p.custom_values?.[f.key] ?? null,
    }))
    .filter((e) => e.value !== null && e.value !== '')

  if (entries.length === 0) return null

  return (
    <div className="text-[10px] text-ink-500 mt-0.5">
      {entries.map((e, i) => (
        <span key={i}>
          {i > 0 ? ' · ' : ''}
          {e.label}: {String(e.value)}
        </span>
      ))}
    </div>
  )
}