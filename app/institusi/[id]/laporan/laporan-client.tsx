'use client'

// ============================================================
// FILE: app/institusi/[id]/laporan/laporan-client.tsx
// ============================================================

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRef, useState } from 'react'
import Image from 'next/image'

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

type KehadiranRow = {
  id: string
  tanggal: string
  status: string
  keterangan: string | null
}

type SantriData = {
  santri: Santri
  waliKelas: { id: string; nama: string; ttd_url: string | null } | null
  kategoriList: Kategori[]
  totalSetoran: number
  kehadiranList: KehadiranRow[]
  kehadiranCount: {
    hadir: number
    izin: number
    sakit: number
    alpha: number
  }
  totalKehadiranTercatat: number
  poinLog: PoinLog[]
  poinAwal: number
  poinAkhir: number
}

type Institusi = {
  id: number
  nama: string
  jenis: string
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

const statusKehadiranLabel: Record<string, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  alpha: 'Alpha',
}

function formatTanggal(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBulan(bulanStr: string) {
  const match = bulanStr.match(/^(\d{4})-(\d{1,2})$/)
  if (!match) return bulanStr
  const year = parseInt(match[1])
  const month = parseInt(match[2])
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export default function LaporanClient({
  institusi,
  institusiId,
  santriList,
  currentSantriId,
  currentBulan,
  santriData,
}: {
  institusi: Institusi
  institusiId: number
  santriList: Santri[]
  currentSantriId: string | null
  currentBulan: string
  periodStart: string
  periodEnd: string
  santriData: SantriData | null
}) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const updateQuery = (santri: string, bulan: string) => {
    const params = new URLSearchParams()
    if (santri) params.set('santri', santri)
    // WAJIB 'bulan' — page.tsx membaca searchParams.bulan.
    // Dulu ini ditulis 'minggu' sehingga picker bulan tidak pernah berpengaruh.
    if (bulan) params.set('bulan', bulan)
    router.push(`/institusi/${institusiId}/laporan?${params.toString()}`)
  }

  const handleDownloadPDF = async () => {
    if (!printRef.current || !santriData) return
    setIsDownloading(true)
    try {
      // Dynamic import biar library cuma di-load di browser
      const html2pdf = (await import('html2pdf.js')).default
      const fileName = `Laporan-${santriData.santri.nama}-${currentBulan}.pdf`
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(printRef.current)
        .save()
    } catch (err) {
      console.error('Download PDF gagal:', err)
      alert('Download PDF gagal. Coba refresh halaman.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Total kehadiran bulanan
  const totalHariEfektif = santriData?.totalKehadiranTercatat ?? 0
  const persenHadir =
    santriData && totalHariEfektif > 0
      ? Math.round((santriData.kehadiranCount.hadir / totalHariEfektif) * 100)
      : 0

  return (
    <div>
      {/* PICKER */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
              Laporan Bulanan
            </div>
            <h1 className="font-display text-5xl text-forest-800 leading-none">
              Laporan
            </h1>
            <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
              Cetak rapor bulanan santri buat wali murid. Pilih santri dan
              bulan, lalu download PDF.
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
              onChange={(e) => updateQuery(e.target.value, currentBulan)}
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
              Bulan
            </label>
            <input
              type="month"
              value={currentBulan}
              onChange={(e) =>
                updateQuery(currentSantriId ?? '', e.target.value)
              }
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={!santriData || isDownloading}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-40 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition h-fit"
          >
            {isDownloading ? 'Memproses...' : '⬇ Download PDF'}
          </button>
        </div>
      </div>

      {/* REPORT */}
      {!santriData ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Pilih santri di atas buat lihat laporan.
          </p>
        </div>
      ) : (
        <div
          ref={printRef}
          className="bg-white text-black p-8"
          style={{ fontFamily: 'serif' }}
        >
          {/* KOP SURAT */}
          <div
            className="pb-4 mb-6"
            style={{ borderBottom: '3px double #000' }}
          >
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <Image
                  src="/logo-qa.jpg"
                  alt="Logo Qurrota A'yun"
                  width={90}
                  height={90}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex-1 text-center">
                <div
                  className="text-lg mb-1"
                  style={{ fontFamily: 'serif', direction: 'rtl' }}
                >
                  معهد تحفيظ القران قرة أعين
                </div>
                <div className="font-bold text-2xl leading-tight mb-1">
                  MA&apos;HAD TAHFIDZ QUR&apos;AN QURROTA A&apos;YUN
                </div>
                <div className="text-sm font-semibold mb-1">
                  ( TERAKREDITASI A )
                </div>
                <div className="text-xs mb-1">
                  NSPP : 510331750047 &nbsp; NPSN : 70023433
                </div>
                <div className="text-xs leading-tight">
                  Jl. Batu Jambrut No. 15 Rt.014 Rw.02 Batu Ampar Kramat Jati
                  Jakarta Timur 13520
                  <br />
                  Telp. (021) 800 3893 · E-mail : qaisindonesia@gmail.com
                </div>
              </div>
            </div>
          </div>

          {/* Judul Laporan */}
          <div className="text-center mb-6">
            <div className="font-bold text-xl underline">
              LAPORAN BULANAN SANTRI
            </div>
            <div style={{ fontSize: '13px', marginTop: '2px' }}>
              Bulan {formatBulan(currentBulan)}
            </div>
          </div>

          {/* Info santri */}
          <div className="mb-6">
            <div className="font-bold text-sm mb-2 uppercase tracking-wide">
              Data Santri
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="w-32 py-0.5">Nama</td>
                  <td className="w-4 py-0.5">:</td>
                  <td className="font-semibold py-0.5">
                    {santriData.santri.nama}
                  </td>
                </tr>
                {santriData.santri.kelas && (
                  <tr>
                    <td className="py-0.5">Kelas</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">{santriData.santri.kelas}</td>
                  </tr>
                )}
                {santriData.santri.halaqoh && (
                  <tr>
                    <td className="py-0.5">Halaqoh</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">{santriData.santri.halaqoh}</td>
                  </tr>
                )}
                {santriData.santri.tahun_masuk && (
                  <tr>
                    <td className="py-0.5">Tahun masuk</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">{santriData.santri.tahun_masuk}</td>
                  </tr>
                )}
                {santriData.waliKelas && (
                  <tr>
                    <td className="py-0.5">Wali Kelas</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5 font-semibold">
                      {santriData.waliKelas.nama}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ringkasan bulan */}
          <div
            className="mb-6 grid grid-cols-3 gap-3"
            style={{ pageBreakInside: 'avoid' }}
          >
            <div
              className="p-3 text-center"
              style={{ border: '1px solid #000' }}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1">
                Total Setoran
              </div>
              <div className="font-bold text-2xl">{santriData.totalSetoran}</div>
            </div>
            <div
              className="p-3 text-center"
              style={{ border: '1px solid #000' }}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1">
                Kehadiran
              </div>
              <div className="font-bold text-2xl">{persenHadir}%</div>
              <div className="text-[10px] mt-0.5">
                {santriData.kehadiranCount.hadir}/{totalHariEfektif} hadir
              </div>
            </div>
            <div
              className="p-3 text-center"
              style={{ border: '1px solid #000' }}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1">
                Poin Akhir
              </div>
              <div className="font-bold text-2xl">{santriData.poinAkhir}</div>
              <div className="text-[10px] mt-0.5">
                Awal: {santriData.poinAwal}
              </div>
            </div>
          </div>

          {/* Kehadiran detail */}
          {santriData.kehadiranList.length > 0 && (
            <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
              <div
                className="font-bold text-sm mb-2 uppercase tracking-wide pb-1"
                style={{ borderBottom: '2px solid #000' }}
              >
                Bagian 1 · Kehadiran
              </div>
              <div className="flex flex-wrap gap-4 text-xs mb-2">
                <span>
                  <b>Hadir:</b> {santriData.kehadiranCount.hadir}
                </span>
                <span>
                  <b>Izin:</b> {santriData.kehadiranCount.izin}
                </span>
                <span>
                  <b>Sakit:</b> {santriData.kehadiranCount.sakit}
                </span>
                <span>
                  <b>Alpha:</b> {santriData.kehadiranCount.alpha}
                </span>
              </div>
              <table
                className="w-full text-xs"
                style={{ borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr>
                    <th
                      className="text-left py-1 px-2 w-24"
                      style={{
                        border: '1px solid #000',
                        backgroundColor: '#f0f0f0',
                      }}
                    >
                      Tanggal
                    </th>
                    <th
                      className="text-left py-1 px-2 w-24"
                      style={{
                        border: '1px solid #000',
                        backgroundColor: '#f0f0f0',
                      }}
                    >
                      Status
                    </th>
                    <th
                      className="text-left py-1 px-2"
                      style={{
                        border: '1px solid #000',
                        backgroundColor: '#f0f0f0',
                      }}
                    >
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {santriData.kehadiranList.map((k) => (
                    <tr key={k.id}>
                      <td
                        className="py-1 px-2"
                        style={{ border: '1px solid #000' }}
                      >
                        {formatTanggal(k.tanggal)}
                      </td>
                      <td
                        className="py-1 px-2 font-semibold"
                        style={{ border: '1px solid #000' }}
                      >
                        {statusKehadiranLabel[k.status] ?? k.status}
                      </td>
                      <td
                        className="py-1 px-2 italic"
                        style={{ border: '1px solid #000' }}
                      >
                        {k.keterangan ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rekap Poin */}
          {santriData.poinLog.length > 0 && (
            <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
              <div
                className="font-bold text-sm mb-2 uppercase tracking-wide pb-1"
                style={{ borderBottom: '2px solid #000' }}
              >
                Bagian 2 · Poin Disiplin
              </div>
              {santriData.poinLog.map((log) => (
                <div
                  key={log.id}
                  className="flex items-baseline gap-3 text-xs py-0.5"
                >
                  <div className="w-24 shrink-0">
                    {formatTanggal(log.tanggal)}
                  </div>
                  <div className="w-12 font-bold text-right shrink-0">
                    {log.nilai_perubahan > 0 ? '+' : ''}
                    {log.nilai_perubahan}
                  </div>
                  <div className="w-32 shrink-0">
                    {poinJenisLabel[log.jenis] ?? log.jenis}
                  </div>
                  <div className="italic flex-1">{log.keterangan ?? '—'}</div>
                </div>
              ))}
            </div>
          )}

          {/* Rekap Setoran per kategori */}
          {santriData.kategoriList.length > 0 && (
            <div>
              <div
                className="font-bold text-sm mb-2 uppercase tracking-wide pb-1"
                style={{ borderBottom: '2px solid #000' }}
              >
                Bagian 3 · Setoran &amp; Progres Pembelajaran
              </div>

              {santriData.kategoriList.map((k) => {
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
                    className="mb-5"
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <div
                      className="font-bold text-sm px-3 py-2"
                      style={{
                        backgroundColor: '#e8e8e8',
                        border: '1px solid #000',
                      }}
                    >
                      KATEGORI: {k.nama.toUpperCase()} ({k.progres.length}{' '}
                      setoran)
                    </div>

                    <div
                      className="text-xs px-3 py-1"
                      style={{
                        borderLeft: '1px solid #000',
                        borderRight: '1px solid #000',
                      }}
                    >
                      {totalLancar > 0 && (
                        <span className="mr-4">
                          Kelancaran: {lancar}/{totalLancar} lancar (
                          {Math.round((lancar / totalLancar) * 100)}%)
                        </span>
                      )}
                      {Object.entries(nilaiCounts).length > 0 && (
                        <span>
                          Nilai:{' '}
                          {Object.entries(nilaiCounts)
                            .map(
                              ([kualitas, count]) =>
                                `${count}× ${
                                  kualitasLabel[kualitas] ?? kualitas
                                }`
                            )
                            .join(', ')}
                        </span>
                      )}
                    </div>

                    <table
                      className="w-full text-xs"
                      style={{ borderCollapse: 'collapse' }}
                    >
                      <thead>
                        <tr>
                          <th
                            className="text-left py-1 px-2 w-20"
                            style={{
                              border: '1px solid #000',
                              backgroundColor: '#f0f0f0',
                            }}
                          >
                            Tanggal
                          </th>
                          <th
                            className="text-left py-1 px-2"
                            style={{
                              border: '1px solid #000',
                              backgroundColor: '#f0f0f0',
                            }}
                          >
                            Materi
                          </th>
                          <th
                            className="text-left py-1 px-2 w-24"
                            style={{
                              border: '1px solid #000',
                              backgroundColor: '#f0f0f0',
                            }}
                          >
                            Nilai
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {k.progres.map((p) => (
                          <tr key={p.id}>
                            <td
                              className="py-1 px-2 align-top"
                              style={{ border: '1px solid #000' }}
                            >
                              {new Date(p.tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </td>
                            <td
                              className="py-1 px-2 align-top"
                              style={{ border: '1px solid #000' }}
                            >
                              {renderMateri(p, k.customFields)}
                              {p.catatan && (
                                <div className="italic mt-0.5 text-[10px]">
                                  {p.catatan}
                                </div>
                              )}
                            </td>
                            <td
                              className="py-1 px-2 align-top"
                              style={{ border: '1px solid #000' }}
                            >
                              {p.kualitas
                                ? kualitasLabel[p.kualitas] ?? p.kualitas
                                : '—'}
                              {p.lancar !== null && (
                                <div className="text-[10px]">
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

          {/* Footer + TTD Wali Kelas */}
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'flex-end',
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: '11px' }}>
              <div style={{ marginBottom: '4px' }}>
                Jakarta, {formatTanggal(new Date().toISOString())}
              </div>
              {santriData.waliKelas ? (
                <>
                  <div style={{ marginBottom: '4px' }}>Wali Kelas Pembimbing,</div>
                  {santriData.waliKelas.ttd_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={santriData.waliKelas.ttd_url}
                      alt="TTD"
                      crossOrigin="anonymous"
                      style={{
                        width: '110px',
                        height: '70px',
                        objectFit: 'contain',
                        margin: '4px auto',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div style={{ height: '70px' }} />
                  )}
                  <div
                    style={{
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      marginTop: '2px',
                    }}
                  >
                    ( {santriData.waliKelas.nama} )
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '4px' }}>Wali Kelas Pembimbing,</div>
                  <div style={{ height: '70px' }} />
                  <div style={{ fontWeight: 'bold' }}>( ................... )</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// renderMateri — isi kolom "Materi" di tabel setoran.
//
// Kategori tanpa materi standar (bukan tahfiz/kitab/iqro) dulu cuma dapat
// tanda "—" di baris utama, sementara isi sebenarnya nyempil di baris kecil
// di bawahnya. Sekarang: kalau tidak ada materi standar sama sekali, field
// custom NAIK jadi baris utama, jadi kolomnya tidak pernah kosong percuma.
// Kalau materi standar ada, field custom tetap tampil di bawahnya.
// ============================================================
function renderMateri(p: ProgresRow, customFields: CustomField[] = []) {
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

  const customEntries = customFields
    .map((f) => ({
      label: f.label,
      value: p.custom_values?.[f.key] ?? null,
    }))
    .filter((e) => e.value !== null && e.value !== '')

  const customText = customEntries
    .map((e) => `${e.label}: ${String(e.value)}`)
    .join(' · ')

  // Tidak ada materi standar → field custom jadi baris utama.
  if (parts.length === 0) {
    return <div>{customText || '—'}</div>
  }

  // Ada materi standar → field custom tampil kecil di bawahnya.
  return (
    <>
      <div>{parts.join(' · ')}</div>
      {customText && <div className="text-[10px] mt-0.5">{customText}</div>}
    </>
  )
}