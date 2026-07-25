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
      // html2pdf menerima 'pagebreak' saat runtime; tipe bawaannya belum mencakup itu.
      const pdfOpt: any = {
          margin: [10, 10, 10, 10],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        }
      await html2pdf()
        .set(pdfOpt)
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
          className="report-print bg-white"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "#1C1A17" }}
        >
          <style>{`
            .report-print { padding: 26px 30px 30px; }
            .report-print .rpt-tbl {
              width: 100%;
              border-collapse: collapse;
              font-size: 11.5px;
            }
            .report-print .rpt-tbl thead th {
              background: #2E4034;
              color: #fff;
              text-align: left;
              font-weight: 600;
              padding: 6px 10px;
              letter-spacing: 0.02em;
            }
            .report-print .rpt-tbl--flush thead th { border-radius: 0; }
            .report-print .rpt-tbl td {
              padding: 5px 10px;
              border-bottom: 1px solid #ECE6D7;
            }
            .report-print .rpt-tbl tr:last-child td { border-bottom: 1px solid #D8D0C0; }
          `}</style>
          {/* ================= KOP SURAT ================= */}
          <div style={{ padding: "8px 8px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                paddingBottom: "14px",
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <Image
                  src="/logo-qa.jpg"
                  alt="Logo Qurrota A'yun"
                  width={82}
                  height={82}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "17px",
                    direction: "rtl",
                    color: "#2E4034",
                    marginBottom: "2px",
                  }}
                >
                  معهد تحفيظ القران قرة أعين
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "23px",
                    lineHeight: 1.1,
                    letterSpacing: "0.01em",
                    color: "#1C1A17",
                  }}
                >
                  MA&apos;HAD TAHFIDZ QUR&apos;AN QURROTA A&apos;YUN
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: "#A9803F",
                    margin: "3px 0 4px",
                  }}
                >
                  Terakreditasi A
                </div>
                <div style={{ fontSize: "10.5px", color: "#4A473C", lineHeight: 1.5 }}>
                  NSPP 510331750047 &nbsp;·&nbsp; NPSN 70023433
                  <br />
                  Jl. Batu Jambrut No. 15 RT.014 RW.02 Batu Ampar, Kramat Jati,
                  Jakarta Timur 13520
                  <br />
                  Telp. (021) 800 3893 &nbsp;·&nbsp; qaisindonesia@gmail.com
                </div>
              </div>
            </div>
            {/* garis kop: tebal emas + tipis di bawahnya */}
            <div style={{ height: "3px", background: "#2E4034" }} />
            <div style={{ height: "1px", background: "#A9803F", marginTop: "2px" }} />
          </div>

          {/* ================= JUDUL RAPOR (PITA) ================= */}
          <div style={{ padding: "22px 8px 0" }}>
            <div
              style={{
                background: "#2E4034",
                borderRadius: "3px",
                padding: "14px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#EBD9B8",
                  fontSize: "11px",
                  letterSpacing: "0.34em",
                  textTransform: "uppercase",
                }}
              >
                Laporan Perkembangan Santri
              </div>
              <div
                style={{
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "20px",
                  letterSpacing: "0.02em",
                  marginTop: "3px",
                }}
              >
                {formatBulan(currentBulan)}
              </div>
            </div>
          </div>

          {/* ================= DATA SANTRI + RINGKASAN ================= */}
          <div
            style={{
              padding: "22px 8px 0",
              display: "grid",
              gridTemplateColumns: "1.15fr 1fr",
              gap: "20px",
              alignItems: "start",
            }}
          >
            {/* Data santri */}
            <div>
              <SectionLabel>Identitas Santri</SectionLabel>
              <table style={{ width: "100%", fontSize: "12.5px", marginTop: "8px" }}>
                <tbody>
                  <DataRow label="Nama" value={santriData.santri.nama} bold />
                  {santriData.santri.kelas && (
                    <DataRow label="Kelas" value={santriData.santri.kelas} />
                  )}
                  {santriData.santri.halaqoh && (
                    <DataRow label="Halaqoh" value={santriData.santri.halaqoh} />
                  )}
                  {santriData.santri.tahun_masuk && (
                    <DataRow
                      label="Tahun masuk"
                      value={String(santriData.santri.tahun_masuk)}
                    />
                  )}
                  {santriData.waliKelas && (
                    <DataRow
                      label="Wali kelas"
                      value={santriData.waliKelas.nama}
                      bold
                    />
                  )}
                </tbody>
              </table>
            </div>

            {/* Ringkasan — 3 metrik dalam satu panel krem, dipisah garis emas */}
            <div
              style={{
                background: "#F6F3EC",
                border: "1px solid #E4DCC8",
                borderRadius: "6px",
                padding: "4px 0",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
              }}
            >
              <Metric
                nilai={String(santriData.totalSetoran)}
                label="Setoran"
              />
              <Metric
                nilai={`${persenHadir}%`}
                label="Kehadiran"
                sub={`${santriData.kehadiranCount.hadir}/${totalHariEfektif}`}
                divider
              />
              <Metric
                nilai={String(santriData.poinAkhir)}
                label="Poin"
                sub={`awal ${santriData.poinAwal}`}
                divider
              />
            </div>
          </div>

          {/* ================= BAGIAN 1 · KEHADIRAN ================= */}
          {santriData.kehadiranList.length > 0 && (
            <div style={{ padding: "26px 8px 0", pageBreakInside: "avoid" }}>
              <SectionHead no="1" judul="Rekapitulasi Kehadiran" />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "18px",
                  fontSize: "12px",
                  margin: "10px 0 10px",
                }}
              >
                <Pill label="Hadir" n={santriData.kehadiranCount.hadir} tone="hadir" />
                <Pill label="Izin" n={santriData.kehadiranCount.izin} />
                <Pill label="Sakit" n={santriData.kehadiranCount.sakit} />
                <Pill label="Alpha" n={santriData.kehadiranCount.alpha} tone="alpha" />
              </div>
              <table className="rpt-tbl">
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>Tanggal</th>
                    <th style={{ width: "120px" }}>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {santriData.kehadiranList.map((k, idx) => (
                    <tr key={k.id} style={{ background: idx % 2 ? "#FBF9F3" : "#FFF" }}>
                      <td>{formatTanggal(k.tanggal)}</td>
                      <td style={{ fontWeight: 600 }}>
                        {statusKehadiranLabel[k.status] ?? k.status}
                      </td>
                      <td style={{ fontStyle: "italic", color: "#4A473C" }}>
                        {k.keterangan ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= BAGIAN 2 · POIN ================= */}
          {santriData.poinLog.length > 0 && (
            <div style={{ padding: "26px 8px 0", pageBreakInside: "avoid" }}>
              <SectionHead no="2" judul="Poin Disiplin" />
              <div style={{ marginTop: "8px" }}>
                {santriData.poinLog.map((log) => {
                  const naik = log.nilai_perubahan > 0
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "12px",
                        fontSize: "12px",
                        padding: "3px 0",
                        borderBottom: "1px solid #EFEADD",
                      }}
                    >
                      <div style={{ width: "96px", flexShrink: 0, color: "#4A473C" }}>
                        {formatTanggal(log.tanggal)}
                      </div>
                      <div
                        style={{
                          width: "42px",
                          textAlign: "right",
                          flexShrink: 0,
                          fontWeight: 700,
                          color: naik ? "#2E6B4F" : "#A23B3B",
                        }}
                      >
                        {naik ? "+" : ""}
                        {log.nilai_perubahan}
                      </div>
                      <div style={{ width: "130px", flexShrink: 0 }}>
                        {poinJenisLabel[log.jenis] ?? log.jenis}
                      </div>
                      <div style={{ fontStyle: "italic", color: "#4A473C", flex: 1 }}>
                        {log.keterangan ?? "—"}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ================= BAGIAN 3 · SETORAN ================= */}
          {santriData.kategoriList.length > 0 && (
            <div style={{ padding: "26px 8px 0" }}>
              <SectionHead no="3" judul="Setoran & Progres Pembelajaran" />

              {santriData.kategoriList.map((k) => {
                const lancar = k.progres.filter((p) => p.lancar === true).length
                const totalLancar = k.progres.filter((p) => p.lancar !== null).length
                const nilaiCounts: Record<string, number> = {}
                for (const p of k.progres) {
                  if (p.kualitas)
                    nilaiCounts[p.kualitas] = (nilaiCounts[p.kualitas] ?? 0) + 1
                }
                return (
                  <div
                    key={k.id}
                    style={{ marginTop: "14px", pageBreakInside: "avoid" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "#2E4034",
                        color: "#FFF",
                        padding: "7px 12px",
                        borderRadius: "4px 4px 0 0",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                      }}
                    >
                      <span>{k.nama.toUpperCase()}</span>
                      <span style={{ color: "#EBD9B8", fontWeight: 500 }}>
                        {k.progres.length} setoran
                      </span>
                    </div>

                    {(totalLancar > 0 || Object.keys(nilaiCounts).length > 0) && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#4A473C",
                          padding: "5px 12px",
                          background: "#F6F3EC",
                          borderLeft: "1px solid #E4DCC8",
                          borderRight: "1px solid #E4DCC8",
                        }}
                      >
                        {totalLancar > 0 && (
                          <span style={{ marginRight: "16px" }}>
                            Kelancaran {lancar}/{totalLancar} (
                            {Math.round((lancar / totalLancar) * 100)}%)
                          </span>
                        )}
                        {Object.entries(nilaiCounts).length > 0 && (
                          <span>
                            Nilai{" "}
                            {Object.entries(nilaiCounts)
                              .map(
                                ([q, c]) => `${c}× ${kualitasLabel[q] ?? q}`
                              )
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    )}

                    <table className="rpt-tbl rpt-tbl--flush">
                      <thead>
                        <tr>
                          <th style={{ width: "78px" }}>Tanggal</th>
                          <th>Materi</th>
                          <th style={{ width: "110px" }}>Nilai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {k.progres.map((p, idx) => (
                          <tr
                            key={p.id}
                            style={{ background: idx % 2 ? "#FBF9F3" : "#FFF" }}
                          >
                            <td style={{ verticalAlign: "top" }}>
                              {new Date(p.tanggal).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })}
                            </td>
                            <td style={{ verticalAlign: "top" }}>
                              {renderMateri(p, k.customFields)}
                              {p.catatan && (
                                <div
                                  style={{
                                    fontStyle: "italic",
                                    fontSize: "10.5px",
                                    marginTop: "2px",
                                    color: "#4A473C",
                                  }}
                                >
                                  {p.catatan}
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: "top" }}>
                              {p.kualitas
                                ? kualitasLabel[p.kualitas] ?? p.kualitas
                                : "—"}
                              {p.lancar !== null && (
                                <div style={{ fontSize: "10.5px", color: "#4A473C" }}>
                                  {p.lancar ? "Lancar" : "Tidak lancar"}
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

          {/* ================= TTD WALI KELAS ================= */}
          <div
            style={{
              padding: "34px 8px 8px",
              display: "flex",
              justifyContent: "flex-end",
              pageBreakInside: "avoid",
            }}
          >
            <div style={{ textAlign: "center", fontSize: "11.5px", minWidth: "200px" }}>
              <div style={{ marginBottom: "2px", color: "#4A473C" }}>
                Jakarta, {formatTanggal(new Date().toISOString())}
              </div>
              <div style={{ marginBottom: "2px" }}>Wali Kelas Pembimbing</div>
              {santriData.waliKelas?.ttd_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={santriData.waliKelas.ttd_url}
                  alt="TTD"
                  crossOrigin="anonymous"
                  style={{
                    width: "120px",
                    height: "68px",
                    objectFit: "contain",
                    margin: "4px auto",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ height: "68px" }} />
              )}
              <div
                style={{
                  fontWeight: 700,
                  color: "#2E4034",
                  borderTop: "1px solid #A9803F",
                  paddingTop: "3px",
                  display: "inline-block",
                  minWidth: "160px",
                }}
              >
                {santriData.waliKelas ? santriData.waliKelas.nama : "………………………"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Komponen kecil untuk tampilan rapor (redesign)
// ============================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "#A9803F",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function SectionHead({ no, judul }: { no: string; judul: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: "1px solid #A9803F",
            color: "#A9803F",
            fontSize: "11px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {no}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#2E4034",
            letterSpacing: "0.01em",
          }}
        >
          {judul}
        </span>
      </div>
      <div style={{ height: "1px", background: "#A9803F", opacity: 0.5, marginTop: "6px" }} />
    </div>
  )
}

function DataRow({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <tr>
      <td style={{ width: "108px", padding: "2px 0", color: "#4A473C" }}>{label}</td>
      <td style={{ width: "12px", padding: "2px 0", color: "#9A947F" }}>:</td>
      <td style={{ padding: "2px 0", fontWeight: bold ? 700 : 400 }}>{value}</td>
    </tr>
  )
}

function Metric({
  nilai,
  label,
  sub,
  divider,
}: {
  nilai: string
  label: string
  sub?: string
  divider?: boolean
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "12px 6px",
        borderLeft: divider ? "1px solid #E4DCC8" : "none",
      }}
    >
      <div
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: "#A9803F",
          lineHeight: 1,
        }}
      >
        {nilai}
      </div>
      <div
        style={{
          fontSize: "9.5px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#4A473C",
          marginTop: "4px",
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: "9.5px", color: "#9A947F", marginTop: "1px" }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function Pill({
  label,
  n,
  tone,
}: {
  label: string
  n: number
  tone?: "hadir" | "alpha"
}) {
  const warna =
    tone === "hadir" ? "#2E6B4F" : tone === "alpha" ? "#A23B3B" : "#4A473C"
  return (
    <span style={{ color: "#4A473C" }}>
      <span style={{ fontWeight: 700, color: warna, fontSize: "13px" }}>{n}</span>{" "}
      {label}
    </span>
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