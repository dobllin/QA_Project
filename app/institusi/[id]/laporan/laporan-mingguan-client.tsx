'use client'

// ============================================================
// FILE: app/institusi/[id]/laporan/laporan-mingguan-client.tsx
//
// Satu dokumen per HALAQOH (per ustadz pengampu). Tiap dokumen
// lengkap: kop surat, seluruh santri ampuannya, dan TTD pengampu
// itu sendiri — jadi bisa di-download satu per satu.
// ============================================================

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import Image from 'next/image'

type ProgresMingguan = {
  id: string
  tanggal: string
  materi: string
  kualitas: string | null
  lancar: boolean | null
  hadir: boolean | null
  catatan: string | null
}

type SantriBlok = {
  santriId: string
  santriNama: string
  kelas: string | null
  halaqoh: string | null
  progres: ProgresMingguan[]
}

type KategoriGroup = {
  kategoriId: number
  kategoriNama: string
  santri: SantriBlok[]
}

type UstadzGroup = {
  ustadzId: string
  ustadzNama: string
  ttdUrl: string | null
  kategoriGroups: KategoriGroup[]
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

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function formatTanggal(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTanggalPendek(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${HARI[d.getDay()].slice(0, 3)}, ${d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })}`
}

function amanUntukNamaFile(s: string) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Hitung ringkasan satu halaqoh
function hitungHalaqoh(g: UstadzGroup) {
  let total = 0
  let belum = 0
  const namaHalaqoh = new Set<string>()
  for (const k of g.kategoriGroups) {
    for (const s of k.santri) {
      total += 1
      if (s.progres.length === 0) belum += 1
      if (s.halaqoh) namaHalaqoh.add(s.halaqoh)
    }
  }
  return { total, belum, halaqoh: Array.from(namaHalaqoh).sort() }
}

export default function LaporanMingguanClient({
  institusi,
  institusiId,
  currentMinggu,
  periodeStart,
  periodeEnd,
  ustadzGroups,
  totalBaris,
  totalBelumDiisi,
  adaKategoriMingguan,
}: {
  institusi: Institusi
  institusiId: number
  currentMinggu: string
  periodeStart: string
  periodeEnd: string
  ustadzGroups: UstadzGroup[]
  totalBaris: number
  totalBelumDiisi: number
  adaKategoriMingguan: boolean
}) {
  const router = useRouter()
  const refs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [sedangUnduh, setSedangUnduh] = useState<string | null>(null)

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) refs.current.set(id, el)
    else refs.current.delete(id)
  }

  const gantiMinggu = (minggu: string) => {
    const params = new URLSearchParams()
    params.set('mode', 'mingguan')
    if (minggu) params.set('minggu', minggu)
    router.push(`/institusi/${institusiId}/laporan?${params.toString()}`)
  }

  const unduh = async (ustadzId: string, ustadzNama: string) => {
    const el = refs.current.get(ustadzId)
    if (!el) return
    setSedangUnduh(ustadzId)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      // html2pdf menerima 'pagebreak' saat runtime; tipe bawaannya belum mencakup itu.
      const pdfOpt: any = {
          // margin: [atas, kiri, bawah, kanan] dalam mm. Bawah diperbesar
          // jadi 16mm supaya tanda tangan & tanggal tidak mepet/terpotong
          // di tepi bawah halaman.
          margin: [12, 10, 16, 10],
          filename: `Laporan-Mingguan-${amanUntukNamaFile(
            ustadzNama
          )}-${currentMinggu}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          // 'css' + 'legacy' menghormati pageBreakInside:avoid pada blok TTD
          // tanpa memaksa seluruh elemen dipisah (yang bikin konten ke tepi).
          pagebreak: { mode: ['css', 'legacy'] },
        }
      await html2pdf()
        .set(pdfOpt)
        .from(el)
        .save()
    } catch (err) {
      console.error('Download PDF gagal:', err)
      alert('Download PDF gagal. Coba refresh halaman.')
    } finally {
      setSedangUnduh(null)
    }
  }

  const totalTerisi = totalBaris - totalBelumDiisi

  return (
    <div>
      {/* HEADER + PICKER */}
      <div className="mb-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Laporan Mingguan
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Mingguan
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-lg leading-relaxed">
          Rekap tahsin &amp; tahfiz seminggu. Satu dokumen per halaqoh — berisi
          semua santri yang diampu ustadz tersebut, sekali download. Santri yang
          belum ada setorannya ditandai.
        </p>

        <div className="divider-double mb-6 mt-6" />

        <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-end bg-cream-50 border border-line rounded-xl p-5">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Minggu (Senin–Minggu)
            </label>
            <input
              type="week"
              value={currentMinggu}
              onChange={(e) => gantiMinggu(e.target.value)}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div className="text-xs text-ink-500 sm:text-right">
            {formatTanggal(periodeStart)} — {formatTanggal(periodeEnd)}
            <div className="mt-0.5 text-ink-400">
              {ustadzGroups.length} halaqoh · {totalBaris} santri
            </div>
          </div>
        </div>

        {/* Penanda kelengkapan */}
        {totalBaris > 0 && (
          <div
            className={`mt-3 rounded-xl border p-4 ${
              totalBelumDiisi > 0
                ? 'bg-error-500/5 border-error-500/30'
                : 'bg-success-500/10 border-success-500/30'
            }`}
          >
            {totalBelumDiisi > 0 ? (
              <div className="text-sm text-error-500">
                <span className="font-medium">
                  {totalBelumDiisi} dari {totalBaris} belum diisi
                </span>{' '}
                minggu ini. Cari baris bertanda{' '}
                <span className="font-medium">BELUM DIISI</span> di bawah, lalu
                minta pengampunya melengkapi.
              </div>
            ) : (
              <div className="text-sm text-success-500">
                Lengkap — {totalTerisi} dari {totalBaris} sudah terisi minggu
                ini.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ISI */}
      {!adaKategoriMingguan ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Belum ada kategori tahsin atau tahfiz di institusi ini. Buat dulu di
            menu Kategori — nama yang dikenali antara lain Tahsin, Tahfiz,
            Tahfidz, Hafalan, Murojaah, atau Quran.
          </p>
        </div>
      ) : ustadzGroups.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Belum ada penugasan santri di kategori tahsin/tahfiz. Tugaskan dulu
            pengampu dan santrinya di menu Kategori.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {ustadzGroups.map((g) => {
            const ringkas = hitungHalaqoh(g)
            return (
              <div key={g.ustadzId}>
                {/* Kepala kartu: nama pengampu + tombol download halaqoh ini */}
                <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-widest text-copper-600">
                      Halaqoh
                      {ringkas.halaqoh.length > 0 &&
                        ` · ${ringkas.halaqoh.join(', ')}`}
                    </div>
                    <div className="font-display text-2xl text-forest-800 leading-tight">
                      {g.ustadzNama}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {ringkas.total} santri
                      {ringkas.belum > 0 ? (
                        <span className="text-error-500">
                          {' '}
                          · {ringkas.belum} belum diisi
                        </span>
                      ) : (
                        <span className="text-success-500"> · lengkap</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => unduh(g.ustadzId, g.ustadzNama)}
                    disabled={sedangUnduh !== null}
                    className="bg-forest-700 hover:bg-forest-800 disabled:opacity-40 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition shrink-0"
                  >
                    {sedangUnduh === g.ustadzId
                      ? 'Memproses...'
                      : '⬇ Download PDF halaqoh ini'}
                  </button>
                </div>

                {/* Dokumen yang dicetak */}
                <div
                  ref={setRef(g.ustadzId)}
                  className="report-print bg-white"
                  style={{
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    color: "#1C1A17",
                  }}
                >
                  <style>{`
                    .report-print { padding: 26px 30px 30px; }
                    .report-print .rpt-tbl { width:100%; border-collapse:collapse; font-size:11px; }
                    .report-print .rpt-tbl thead th {
                      background:#2E4034; color:#fff; text-align:left;
                      font-weight:600; padding:6px 10px; letter-spacing:.02em;
                    }
                    .report-print .rpt-tbl td { padding:5px 10px; border-bottom:1px solid #ECE6D7; }
                    .report-print .rpt-tbl tr:last-child td { border-bottom:1px solid #D8D0C0; }
                  `}</style>

                  {/* KOP */}
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
                        Jl. Batu Jambrut No. 15 RT.014 RW.02 Batu Ampar, Kramat
                        Jati, Jakarta Timur 13520
                        <br />
                        Telp. (021) 800 3893 &nbsp;·&nbsp; qaisindonesia@gmail.com
                      </div>
                    </div>
                  </div>
                  <div style={{ height: "3px", background: "#2E4034" }} />
                  <div style={{ height: "1px", background: "#A9803F", marginTop: "2px" }} />

                  {/* PITA JUDUL */}
                  <div style={{ paddingTop: "22px" }}>
                    <div
                      style={{
                        background: "#2E4034",
                        borderRadius: "3px",
                        padding: "13px 20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#EBD9B8",
                          fontSize: "11px",
                          letterSpacing: "0.32em",
                          textTransform: "uppercase",
                        }}
                      >
                        Laporan Mingguan Tahsin &amp; Tahfiz
                      </div>
                      <div
                        style={{
                          color: "#FFFFFF",
                          fontWeight: 700,
                          fontSize: "16px",
                          marginTop: "3px",
                        }}
                      >
                        {formatTanggal(periodeStart)} — {formatTanggal(periodeEnd)}
                      </div>
                    </div>
                  </div>

                  {/* DATA HALAQOH + RINGKAS */}
                  <div
                    style={{
                      paddingTop: "20px",
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr",
                      gap: "20px",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: "#A9803F",
                          fontWeight: 600,
                        }}
                      >
                        Data Halaqoh
                      </div>
                      <table style={{ width: "100%", fontSize: "12.5px", marginTop: "8px" }}>
                        <tbody>
                          <tr>
                            <td style={{ width: "104px", padding: "2px 0", color: "#4A473C" }}>
                              Pengampu
                            </td>
                            <td style={{ width: "12px", color: "#9A947F" }}>:</td>
                            <td style={{ fontWeight: 700 }}>{g.ustadzNama}</td>
                          </tr>
                          {ringkas.halaqoh.length > 0 && (
                            <tr>
                              <td style={{ padding: "2px 0", color: "#4A473C" }}>Halaqoh</td>
                              <td style={{ color: "#9A947F" }}>:</td>
                              <td>{ringkas.halaqoh.join(", ")}</td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ padding: "2px 0", color: "#4A473C" }}>Lembaga</td>
                            <td style={{ color: "#9A947F" }}>:</td>
                            <td>{institusi.nama}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        background: "#F6F3EC",
                        border: "1px solid #E4DCC8",
                        borderRadius: "6px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                      }}
                    >
                      <div style={{ textAlign: "center", padding: "12px 6px" }}>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "#A9803F", lineHeight: 1 }}>
                          {ringkas.total}
                        </div>
                        <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#4A473C", marginTop: "4px" }}>
                          Santri
                        </div>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px 6px", borderLeft: "1px solid #E4DCC8" }}>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "#2E6B4F", lineHeight: 1 }}>
                          {ringkas.total - ringkas.belum}
                        </div>
                        <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#4A473C", marginTop: "4px" }}>
                          Terisi
                        </div>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px 6px", borderLeft: "1px solid #E4DCC8" }}>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: ringkas.belum > 0 ? "#A23B3B" : "#A9803F", lineHeight: 1 }}>
                          {ringkas.belum}
                        </div>
                        <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#4A473C", marginTop: "4px" }}>
                          Belum
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TABEL PER KATEGORI */}
                  {g.kategoriGroups.map((k) => (
                    <div
                      key={k.kategoriId}
                      style={{ marginTop: "14px", pageBreakInside: "avoid" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#2E4034",
                          color: "#fff",
                          padding: "7px 12px",
                          borderRadius: "4px 4px 0 0",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                        }}
                      >
                        <span>{k.kategoriNama.toUpperCase()}</span>
                        <span style={{ color: "#EBD9B8", fontWeight: 500 }}>
                          {k.santri.length} santri
                        </span>
                      </div>

                      <table className="rpt-tbl">
                        <thead>
                          <tr>
                            <th style={{ width: "34px" }}>No</th>
                            <th style={{ width: "150px" }}>Santri</th>
                            <th>Setoran Minggu Ini</th>
                            <th style={{ width: "48px" }}>Sesi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {k.santri.map((s, i) => {
                            const kosong = s.progres.length === 0
                            return (
                              <tr
                                key={s.santriId}
                                style={{
                                  background: kosong
                                    ? "#FBEDEA"
                                    : i % 2
                                    ? "#FBF9F3"
                                    : "#FFF",
                                }}
                              >
                                <td style={{ verticalAlign: "top", textAlign: "center" }}>
                                  {i + 1}
                                </td>
                                <td style={{ verticalAlign: "top" }}>
                                  <div style={{ fontWeight: 600 }}>
                                    {s.santriNama}
                                  </div>
                                  {(s.kelas || s.halaqoh) && (
                                    <div style={{ fontSize: "10px", color: "#4A473C" }}>
                                      {[s.kelas, s.halaqoh]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </div>
                                  )}
                                </td>
                                <td style={{ verticalAlign: "top" }}>
                                  {kosong ? (
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "10px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        color: "#A23B3B",
                                        border: "1px solid #E0A9A0",
                                        borderRadius: "3px",
                                        padding: "1px 6px",
                                      }}
                                    >
                                      Belum diisi
                                    </span>
                                  ) : (
                                    s.progres.map((pr) => (
                                      <div
                                        key={pr.id}
                                        className="mb-1 last:mb-0"
                                      >
                                        <span className="font-semibold">
                                          {formatTanggalPendek(pr.tanggal)}
                                        </span>
                                        {pr.materi ? ` — ${pr.materi}` : ''}
                                        {pr.kualitas && (
                                          <span>
                                            {' '}
                                            ·{' '}
                                            {kualitasLabel[pr.kualitas] ??
                                              pr.kualitas}
                                          </span>
                                        )}
                                        {pr.lancar !== null && (
                                          <span>
                                            {' '}
                                            ·{' '}
                                            {pr.lancar
                                              ? 'Lancar'
                                              : 'Tidak lancar'}
                                          </span>
                                        )}
                                        {pr.hadir === false && (
                                          <span> · Tidak hadir</span>
                                        )}
                                        {pr.catatan && (
                                          <div className="italic text-[10px]">
                                            {pr.catatan}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </td>
                                <td style={{ verticalAlign: "top", textAlign: "center" }}>
                                  {s.progres.length}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}

                  {/* TTD pengampu. Dibungkus kuat agar tidak terpotong di
                      batas halaman PDF: pageBreakInside avoid + breakInside
                      avoid + padding bawah sebagai ruang aman. */}
                  <div
                    style={{
                      marginTop: '24px',
                      paddingBottom: '24px',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>
                        Jakarta, {formatTanggal(periodeEnd)}
                      </div>
                      <div style={{ marginBottom: '4px' }}>Pengampu,</div>
                      {g.ttdUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.ttdUrl}
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
                        ( {g.ustadzNama} )
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}