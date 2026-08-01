'use client'

// ============================================================
// FILE: app/super/perangkat/perangkat-client.tsx
//
// UI "Perangkat Ajar AI". Struktur & field mengikuti tampilan EduCraft
// (screenshot), tapi warnanya diselaraskan ke tema super admin
// (cream / forest / copper / ink + font-display).
//
// Scaffolding tiap generator (state loading, render markdown, tombol
// export) dijadikan SATU hook + komponen bersama supaya tidak
// triplikat seperti versi aslinya.
//
// Semua panggilan AI lewat server action di ./actions — API key tidak
// pernah menyentuh browser.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  generateModulAjar,
  type ModulInput,
  generateBahanAjar,
  type BahanInput,
  generateAsesmen,
  type AsesmenInput,
  generateMediaInteraktif,
  type MediaInput,
  generateInfografis,
  type InfografisInput,
} from './actions'

// ------------------------------------------------------------
// Kelas util yang dipakai berulang
// ------------------------------------------------------------
const fieldCls =
  'w-full px-3 py-2 border border-line rounded-lg bg-cream-50 text-ink-900 text-sm outline-none focus:border-forest-700 transition placeholder:text-ink-400'
const primaryBtn =
  'w-full inline-flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-60 disabled:cursor-not-allowed text-cream-50 py-3 px-4 rounded-lg font-medium transition'
const toolBtn =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-forest-800 border border-line rounded-lg hover:bg-cream-200/60 transition'

// ------------------------------------------------------------
// Ikon inline (tanpa dependency icon apa pun)
// ------------------------------------------------------------
function Sparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1z"
        fill="currentColor"
      />
    </svg>
  )
}
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ------------------------------------------------------------
// Toast sederhana lewat context
// ------------------------------------------------------------
type Notify = (msg: string, type?: 'success' | 'error') => void
const ToastCtx = createContext<Notify>(() => {})
const useToast = () => useContext(ToastCtx)

function ToastHost({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const notify: Notify = (msg, type = 'success') => {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3200)
  }
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
        }`}
      >
        {toast && (
          <div
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-cream-50 ${
              toast.type === 'error' ? 'bg-error-500' : 'bg-forest-700'
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

// ------------------------------------------------------------
// Helper klien: render markdown, export, copy, download
// ------------------------------------------------------------
async function renderMarkdown(md: string): Promise<string> {
  const { marked } = await import('marked')
  return (await marked.parse(md, { breaks: true })) as string
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function slug(s: string) {
  return (s || 'dokumen').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'dokumen'
}

function exportWord(innerHtml: string, filename: string) {
  const pre = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#111}
    h1{text-align:center;font-size:16pt;margin-bottom:12pt}
    h2{font-size:13pt;border-bottom:1px solid #ccc;padding-bottom:4pt;margin-top:18pt}
    h3{font-size:11pt;font-weight:bold;margin-top:10pt}
    table{border-collapse:collapse;width:100%;margin-bottom:12pt}
    th,td{border:1px solid #000;padding:6pt;text-align:left;vertical-align:top}
    th{background:#f2f2f2}
    li{margin-bottom:4pt}
  </style></head><body>`
  const blob = new Blob(['\ufeff', pre + innerHtml + '</body></html>'], {
    type: 'application/msword',
  })
  triggerDownload(blob, `${filename}.doc`)
}

async function exportPdf(el: HTMLElement, filename: string) {
  // html2pdf.js sudah terpasang di project. Import dinamis supaya hanya
  // dijalankan di browser saat tombol diklik (bukan saat SSR).
  const mod: any = await import('html2pdf.js')
  const html2pdf = mod.default ?? mod
  await html2pdf()
    .set({
      margin: 10,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(el)
    .save()
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(ta)
    }
  }
}

// ------------------------------------------------------------
// Hook generator bersama. Fix bug "selalu sukses": server action
// melempar error, di sini ditangkap ke state `error`.
// ------------------------------------------------------------
function useGenerator<T>(action: (input: T) => Promise<string>) {
  const [loading, setLoading] = useState(false)
  const [raw, setRaw] = useState('')
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')

  async function run(input: T, opts?: { alreadyHtml?: boolean }) {
    setLoading(true)
    setError('')
    setRaw('')
    setHtml('')
    try {
      const out = await action(input)
      setRaw(out)
      setHtml(opts?.alreadyHtml ? out : await renderMarkdown(out))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return { loading, raw, html, error, run }
}

// ------------------------------------------------------------
// Komponen kecil form
// ------------------------------------------------------------
function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-ink-700 mb-1">
      {children}
      {required && <span className="text-error-500"> *</span>}
    </label>
  )
}

function FormCard({
  title,
  desc,
  onSubmit,
  submitLabel,
  loading,
  children,
}: {
  title: string
  desc?: string
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  loading: boolean
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="bg-cream-50 border border-line rounded-xl overflow-hidden">
      <div className="p-5 border-b border-line">
        <h2 className="font-display text-lg text-forest-800">{title}</h2>
        {desc && <p className="text-sm text-ink-500 mt-1 leading-relaxed">{desc}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
      <div className="p-5 border-t border-line bg-cream-100/50">
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? <Spinner /> : <Sparkle />}
          {loading ? 'Memproses…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ------------------------------------------------------------
// Panel hasil untuk output berbasis Markdown (Modul/Bahan/Asesmen/Infografis)
// ------------------------------------------------------------
function MarkdownResult({
  raw,
  html,
  loading,
  error,
  filename,
  emptyTitle,
  emptyDesc,
}: {
  raw: string
  html: string
  loading: boolean
  error: string
  filename: string
  emptyTitle: string
  emptyDesc: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const notify = useToast()

  return (
    <div className="bg-cream-50 border border-line rounded-xl overflow-hidden min-h-[420px] flex flex-col">
      {html && (
        <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2 flex-wrap bg-cream-100/50">
          <span className="text-sm font-medium text-forest-800">Hasil siap</span>
          <div className="flex items-center gap-2">
            <button
              className={toolBtn}
              onClick={async () => {
                await copyText(raw)
                notify('Teks disalin')
              }}
            >
              Salin
            </button>
            <button
              className={toolBtn}
              onClick={() => {
                exportWord(html, filename)
                notify('Word diunduh')
              }}
            >
              Unduh Word
            </button>
            <button
              className={toolBtn}
              onClick={async () => {
                if (!ref.current) return
                try {
                  await exportPdf(ref.current, filename)
                  notify('PDF diunduh')
                } catch {
                  notify('Gagal membuat PDF', 'error')
                }
              }}
            >
              Unduh PDF
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 p-5 sm:p-6 overflow-x-auto">
        {error && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-error-50 text-error-500 flex items-center justify-center mb-3 font-display text-xl">
              !
            </div>
            <p className="text-sm text-error-500 font-medium max-w-sm">{error}</p>
            <p className="text-xs text-ink-400 mt-2">Perbaiki isian atau coba lagi.</p>
          </div>
        )}

        {!error && loading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-forest-700">
            <Spinner />
            <p className="text-sm text-ink-500 mt-3">Menyusun dokumen…</p>
          </div>
        )}

        {!error && !loading && !html && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <h3 className="font-display text-xl text-forest-800 mb-2">{emptyTitle}</h3>
            <p className="text-sm text-ink-500 leading-relaxed">{emptyDesc}</p>
          </div>
        )}

        {!error && html && (
          <div
            ref={ref}
            className="prose-perangkat max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// VIEW: Modul Ajar
// ============================================================
function ModulView() {
  const notify = useToast()
  const g = useGenerator<ModulInput>(generateModulAjar)
  const [f, setF] = useState<ModulInput>({
    subject: '',
    jenjang: '',
    kelas: '',
    jurusan: '',
    topic: '',
    pertemuan: '',
    alokasi: '',
    learningModel: 'Pendekatan Kontekstual',
    objectives: '',
    additionalContext: '',
  })
  const set = <K extends keyof ModulInput>(k: K, v: ModulInput[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.subject || !f.jenjang || !f.kelas || !f.topic || !f.pertemuan || !f.objectives) {
      notify('Lengkapi isian bertanda *', 'error')
      return
    }
    g.run(f)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-96 shrink-0">
        <FormCard
          title="Parameter Modul"
          desc="Rakit Modul Ajar bergaya Pembelajaran Mendalam (Kurikulum Merdeka)."
          onSubmit={submit}
          submitLabel="Rakit modul mendalam"
          loading={g.loading}
        >
          <div>
            <Label required>Mata Pelajaran</Label>
            <input className={fieldCls} value={f.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Cth: Matematika" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Jenjang</Label>
              <select className={fieldCls} value={f.jenjang} onChange={(e) => set('jenjang', e.target.value)}>
                <option value="">Pilih</option>
                {['SD', 'SMP', 'SMA', 'SMK'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label required>Kelas</Label>
              <select className={fieldCls} value={f.kelas} onChange={(e) => set('kelas', e.target.value)}>
                <option value="">Pilih</option>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          {f.jenjang === 'SMK' && (
            <div>
              <Label required>Jurusan (khusus SMK)</Label>
              <input className={fieldCls} value={f.jurusan} onChange={(e) => set('jurusan', e.target.value)} placeholder="Cth: Teknik Komputer Jaringan" />
            </div>
          )}
          <div>
            <Label required>Topik / Materi Pokok</Label>
            <input className={fieldCls} value={f.topic} onChange={(e) => set('topic', e.target.value)} placeholder="Cth: Aplikasi Perbandingan Trigonometri" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Pertemuan</Label>
              <select className={fieldCls} value={f.pertemuan} onChange={(e) => set('pertemuan', e.target.value)}>
                <option value="">Pilih</option>
                {['1', '2', '3', '4', '5', '6'].map((o) => (
                  <option key={o} value={o}>{o} Pertemuan</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Alokasi Waktu</Label>
              <input className={fieldCls} value={f.alokasi} onChange={(e) => set('alokasi', e.target.value)} placeholder="Cth: 8 JP" />
            </div>
          </div>
          <div>
            <Label>Pendekatan</Label>
            <select className={fieldCls} value={f.learningModel} onChange={(e) => set('learningModel', e.target.value)}>
              <option value="Pendekatan Kontekstual">Kontekstual</option>
              <option value="Problem Based Learning (PBL)">Problem Based Learning</option>
              <option value="Project Based Learning (PjBL)">Project Based Learning</option>
              <option value="Discovery Learning">Discovery Learning</option>
            </select>
          </div>
          <div>
            <Label required>Tujuan Pembelajaran</Label>
            <textarea rows={3} className={`${fieldCls} resize-none`} value={f.objectives} onChange={(e) => set('objectives', e.target.value)} placeholder="Cth: Menyelesaikan permasalahan kontekstual yang berkaitan dengan…" />
          </div>
          <div>
            <Label>Konteks Nyata / Studi Kasus Khusus</Label>
            <textarea rows={2} className={`${fieldCls} resize-none`} value={f.additionalContext} onChange={(e) => set('additionalContext', e.target.value)} placeholder="Cth: Fokus pada pengukuran tinggi menara dan lereng di sekitar…" />
          </div>
        </FormCard>
      </aside>
      <section className="flex-1 min-w-0">
        <MarkdownResult
          {...g}
          filename={`Modul_Ajar_${slug(f.topic)}`}
          emptyTitle="Template RPP Mendalam"
          emptyDesc="Isi parameter di kiri untuk menghasilkan modul lengkap: tabel identitas, tahap Memahami–Mengaplikasi–Merefleksi, rubrik formatif, dan refleksi."
        />
      </section>
    </div>
  )
}

// ============================================================
// VIEW: Bahan Ajar
// ============================================================
function BahanView() {
  const notify = useToast()
  const g = useGenerator<BahanInput>(generateBahanAjar)
  const [f, setF] = useState<BahanInput>({
    subject: '',
    phase: 'SD/MI / Fase B (Kelas 3-4)',
    topic: '',
    duration: '120 Menit',
    objectives: '',
  })
  const set = <K extends keyof BahanInput>(k: K, v: BahanInput[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.subject || !f.topic || !f.objectives) {
      notify('Lengkapi Mata Pelajaran, Judul, dan Tujuan', 'error')
      return
    }
    g.run(f)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-96 shrink-0">
        <FormCard
          title="Parameter Materi"
          desc="Rangkai bahan bacaan & lembar materi terstruktur untuk siswa."
          onSubmit={submit}
          submitLabel="Buat bahan ajar"
          loading={g.loading}
        >
          <div>
            <Label required>Mata Pelajaran</Label>
            <input className={fieldCls} value={f.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Cth: Ilmu Pengetahuan Alam (IPA)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Fase / Kelas</Label>
              <select className={fieldCls} value={f.phase} onChange={(e) => set('phase', e.target.value)}>
                {[
                  'SD/MI / Fase A (Kelas 1-2)',
                  'SD/MI / Fase B (Kelas 3-4)',
                  'SD/MI / Fase C (Kelas 5-6)',
                  'SMP/MTs / Fase D (Kelas 7-9)',
                  'SMA/MA/SMK / Fase E (Kelas 10)',
                  'SMA/MA/SMK / Fase F (Kelas 11-12)',
                ].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Waktu Belajar</Label>
              <input className={fieldCls} value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="Cth: 120 Menit" />
            </div>
          </div>
          <div>
            <Label required>Judul / Topik Bahan Ajar</Label>
            <input className={fieldCls} value={f.topic} onChange={(e) => set('topic', e.target.value)} placeholder="Cth: Ekosistem Hutan Tropis" />
          </div>
          <div>
            <Label required>Tujuan Pembelajaran Utama</Label>
            <textarea rows={4} className={`${fieldCls} resize-none`} value={f.objectives} onChange={(e) => set('objectives', e.target.value)} placeholder="Cth: Siswa dapat mengidentifikasi komponen biotik dan abiotik di lingkungan…" />
          </div>
        </FormCard>
      </aside>
      <section className="flex-1 min-w-0">
        <MarkdownResult
          {...g}
          filename={`Bahan_Ajar_${slug(f.topic)}`}
          emptyTitle="Bahan Bacaan & Latihan"
          emptyDesc="Dokumen mencakup Pendahuluan, Uraian Materi, Rangkuman, Latihan, Tes Formatif, Glosarium, hingga Daftar Pustaka."
        />
      </section>
    </div>
  )
}

// ============================================================
// VIEW: Asesmen
// ============================================================
const JENIS_ASESMEN = [
  'Kuis Singkat',
  'Ulangan Harian/Tes Akhir Bab',
  'Ujian Tengah Semester',
  'Ujian Akhir Semester',
  'Proyek Akhir (Produk)',
  'Presentasi Tugas Akhir',
  'Observasi Sikap',
  'Penilaian Diri',
]
const TES_TERTULIS = [
  'Kuis Singkat',
  'Ulangan Harian/Tes Akhir Bab',
  'Ujian Tengah Semester',
  'Ujian Akhir Semester',
]
const KELAS_ASESMEN = [
  'Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6',
  'Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12',
]
function faseDari(kelas: string) {
  if (['Kelas 1', 'Kelas 2'].includes(kelas)) return 'Fase A'
  if (['Kelas 3', 'Kelas 4'].includes(kelas)) return 'Fase B'
  if (['Kelas 5', 'Kelas 6'].includes(kelas)) return 'Fase C'
  if (['Kelas 7', 'Kelas 8', 'Kelas 9'].includes(kelas)) return 'Fase D'
  if (kelas === 'Kelas 10') return 'Fase E'
  if (['Kelas 11', 'Kelas 12'].includes(kelas)) return 'Fase F'
  return ''
}

function AsesmenView() {
  const notify = useToast()
  const g = useGenerator<AsesmenInput>(generateAsesmen)
  const [f, setF] = useState<AsesmenInput>({
    sekolah: '',
    guru: '',
    alokasi: '',
    kurikulum: 'Kurikulum Merdeka',
    jenjang: '',
    mapel: '',
    materi: '',
    tp: '',
    tipe: 'Kuis Singkat',
    bentuk: 'Pilihan Ganda Tunggal',
    jumlah: '5',
    kesulitan: ['Sedang (MOTS)'],
    bloom: 'Campuran (C1-C6)',
    kunci: 'ya',
  })
  const set = <K extends keyof AsesmenInput>(k: K, v: AsesmenInput[K]) =>
    setF((p) => ({ ...p, [k]: v }))
  const isTertulis = TES_TERTULIS.includes(f.tipe)

  const toggleKesulitan = (level: string) => {
    setF((p) => {
      const cur = p.kesulitan
      if (cur.includes(level)) {
        if (cur.length === 1) return p // sisakan minimal satu
        return { ...p, kesulitan: cur.filter((x) => x !== level) }
      }
      return { ...p, kesulitan: [...cur, level] }
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.jenjang || !f.mapel || !f.materi || !f.tp) {
      notify('Lengkapi Kelas, Mata Pelajaran, Materi, dan TP', 'error')
      return
    }
    g.run(f)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-96 shrink-0">
        <FormCard
          title="Konfigurasi Penilaian"
          desc="Tentukan rincian kurikulum untuk memicu pembuatan asesmen."
          onSubmit={submit}
          submitLabel="Buat instrumen asesmen"
          loading={g.loading}
        >
          <div className="rounded-lg border border-line bg-cream-100/60 p-3 space-y-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-copper-600">
              Identitas Instansi & Pengampu
            </div>
            <div>
              <Label>Nama Sekolah</Label>
              <input className={fieldCls} value={f.sekolah} onChange={(e) => set('sekolah', e.target.value)} placeholder="Cth: SMA Negeri 1 Jakarta" />
            </div>
            <div>
              <Label>Nama Guru Pengampu</Label>
              <input className={fieldCls} value={f.guru} onChange={(e) => set('guru', e.target.value)} placeholder="Cth: Budi Santoso, S.Pd." />
            </div>
            <div>
              <Label>Alokasi Waktu (Menit)</Label>
              <input className={fieldCls} value={f.alokasi} onChange={(e) => set('alokasi', e.target.value)} placeholder="Cth: 90" />
            </div>
          </div>

          <div>
            <Label>Kerangka Kurikulum</Label>
            <select className={fieldCls} value={f.kurikulum} onChange={(e) => set('kurikulum', e.target.value)}>
              <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
              <option value="K13">Kurikulum 2013 (K13)</option>
            </select>
          </div>
          <div>
            <Label required>Jenjang / Kelas</Label>
            <select className={fieldCls} value={f.jenjang} onChange={(e) => set('jenjang', e.target.value)}>
              <option value="">— Pilih Kelas —</option>
              {KELAS_ASESMEN.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Fase Pembelajaran</Label>
            <input
              className={`${fieldCls} bg-cream-200/50 text-ink-500`}
              value={f.kurikulum === 'K13' ? 'Tidak berlaku (K13)' : faseDari(f.jenjang)}
              readOnly
              placeholder="Fase otomatis terisi berdasarkan kelas"
            />
          </div>
          <div>
            <Label required>Mata Pelajaran</Label>
            <input className={fieldCls} value={f.mapel} onChange={(e) => set('mapel', e.target.value)} placeholder="Cth: Matematika, IPAS…" />
          </div>
          <div>
            <Label required>Materi Utama</Label>
            <input className={fieldCls} value={f.materi} onChange={(e) => set('materi', e.target.value)} placeholder="Cth: Energi Alternatif…" />
          </div>
          <div>
            <Label required>{f.kurikulum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Tujuan Pembelajaran (TP)'}</Label>
            <textarea rows={3} className={`${fieldCls} resize-none`} value={f.tp} onChange={(e) => set('tp', e.target.value)} placeholder="Tuliskan capaian yang ingin diukur…" />
          </div>

          <div className="pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-copper-600">
            Spesifikasi Instrumen
          </div>
          <div>
            <Label>Jenis Asesmen</Label>
            <select className={fieldCls} value={f.tipe} onChange={(e) => set('tipe', e.target.value)}>
              {JENIS_ASESMEN.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Bentuk Asesmen / Format Soal</Label>
            <select className={fieldCls} value={f.bentuk} onChange={(e) => set('bentuk', e.target.value)}>
              {['Pilihan Ganda Tunggal', 'Pilihan Ganda Kompleks', 'Menjodohkan', 'Isian Singkat', 'Uraian / Esai', 'Benar-Salah'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {isTertulis && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jumlah Soal</Label>
                  <select className={fieldCls} value={f.jumlah} onChange={(e) => set('jumlah', e.target.value)}>
                    {['5', '10', '15', '20', '25'].map((o) => (
                      <option key={o} value={o}>{o} Soal</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Target Bloom</Label>
                  <select className={fieldCls} value={f.bloom} onChange={(e) => set('bloom', e.target.value)}>
                    {['Campuran (C1-C6)', 'C1-C2 (LOTS)', 'C3-C4 (MOTS)', 'C5-C6 (HOTS)'].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Tingkat Kesulitan</Label>
                <div className="space-y-1.5">
                  {['Mudah (LOTS)', 'Sedang (MOTS)', 'Sulit (HOTS)'].map((lv) => (
                    <label key={lv} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.kesulitan.includes(lv)}
                        onChange={() => toggleKesulitan(lv)}
                        className="accent-forest-700 w-4 h-4"
                      />
                      {lv}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Kunci & Rubrik</Label>
            <select className={fieldCls} value={f.kunci} onChange={(e) => set('kunci', e.target.value)}>
              <option value="ya">Sertakan Kunci</option>
              <option value="tidak">Tanpa Kunci</option>
            </select>
          </div>
        </FormCard>
      </aside>
      <section className="flex-1 min-w-0">
        <MarkdownResult
          {...g}
          filename={`Asesmen_${slug(f.materi)}`}
          emptyTitle="Lembar Instrumen Asesmen"
          emptyDesc="Hasil berupa lembar soal / rubrik profesional lengkap dengan skor maksimal dan (opsional) kunci jawaban."
        />
      </section>
    </div>
  )
}

// ============================================================
// VIEW: Media Interaktif  (output HTML → iframe + unduh HTML)
// ============================================================
function MediaView() {
  const notify = useToast()
  const g = useGenerator<MediaInput>(generateMediaInteraktif)
  const [f, setF] = useState<MediaInput>({
    jenjang: '',
    kelas: '',
    mapel: '',
    topik: '',
    capaian: '',
    kerangka: '',
    jumlahSoal: '3',
  })
  const set = <K extends keyof MediaInput>(k: K, v: MediaInput[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.mapel || !f.topik) {
      notify('Lengkapi Mata Pelajaran dan Topik Bahasan', 'error')
      return
    }
    g.run(f, { alreadyHtml: true })
  }

  const bukaTab = () => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(g.raw)
      w.document.close()
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-96 shrink-0">
        <FormCard
          title="Media Pembelajaran Interaktif"
          desc="AI mengembangkan instruksi singkat jadi presentasi HTML mendalam berikut kuis."
          onSubmit={submit}
          submitLabel="Generate presentasi"
          loading={g.loading}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jenjang Pendidikan</Label>
              <select className={fieldCls} value={f.jenjang} onChange={(e) => set('jenjang', e.target.value)}>
                <option value="">Pilih</option>
                {['SD', 'SMP', 'SMA', 'SMK', 'Perguruan Tinggi'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Kelas</Label>
              <input className={fieldCls} value={f.kelas} onChange={(e) => set('kelas', e.target.value)} placeholder="Cth: X / Semester 1" />
            </div>
          </div>
          <div>
            <Label required>Mata Pelajaran / Mata Kuliah</Label>
            <input className={fieldCls} value={f.mapel} onChange={(e) => set('mapel', e.target.value)} placeholder="Cth: Biologi, Algoritma…" />
          </div>
          <div>
            <Label required>Topik Bahasan</Label>
            <input className={fieldCls} value={f.topik} onChange={(e) => set('topik', e.target.value)} placeholder="Cth: Sel Tumbuhan dan Hewan" />
          </div>
          <div>
            <Label>Capaian Pembelajaran</Label>
            <textarea rows={2} className={`${fieldCls} resize-none`} value={f.capaian} onChange={(e) => set('capaian', e.target.value)} placeholder="Apa hasil akhir yang diukur dari siswa?" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label>Kerangka Teori Singkat</Label>
              <span className="text-[10px] font-medium text-forest-600 bg-cream-200/70 border border-line rounded-full px-2 py-0.5">
                AI mengembangkan bagian ini
              </span>
            </div>
            <textarea rows={4} className={`${fieldCls} resize-none`} value={f.kerangka} onChange={(e) => set('kerangka', e.target.value)} placeholder="Tuliskan 2-3 poin penting mengenai materi ini. AI akan menjabarkannya jadi materi yang teoretis dan komprehensif…" />
          </div>
          <div>
            <Label>Jumlah Soal Evaluasi</Label>
            <select className={fieldCls} value={f.jumlahSoal} onChange={(e) => set('jumlahSoal', e.target.value)}>
              {['3', '5', '10'].map((o) => (
                <option key={o} value={o}>{o} Soal</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink-400 leading-relaxed">
            Butuh ~5–10 detik untuk AI menstrukturkan HTML dan visual.
          </p>
        </FormCard>
      </aside>

      <section className="flex-1 min-w-0">
        <div className="bg-cream-50 border border-line rounded-xl overflow-hidden min-h-[420px] flex flex-col">
          {g.raw && !g.error && (
            <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2 flex-wrap bg-cream-100/50">
              <span className="text-sm font-medium text-forest-800">Pratinjau media</span>
              <div className="flex items-center gap-2">
                <button className={toolBtn} onClick={bukaTab}>Buka di tab baru</button>
                <button
                  className={toolBtn}
                  onClick={() => {
                    triggerDownload(new Blob([g.raw], { type: 'text/html;charset=utf-8' }), `Media_${slug(f.topik)}.html`)
                    notify('HTML diunduh')
                  }}
                >
                  Unduh HTML
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 p-5 sm:p-6">
            {g.error && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-error-50 text-error-500 flex items-center justify-center mb-3 font-display text-xl">!</div>
                <p className="text-sm text-error-500 font-medium max-w-sm">{g.error}</p>
              </div>
            )}
            {!g.error && g.loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-forest-700">
                <Spinner />
                <p className="text-sm text-ink-500 mt-3">Menyusun HTML & visual…</p>
              </div>
            )}
            {!g.error && !g.loading && !g.raw && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <h3 className="font-display text-xl text-forest-800 mb-2">Presentasi Interaktif</h3>
                <p className="text-sm text-ink-500 leading-relaxed">Materi berformat web mandiri, gambar open-source, dan kuis evaluasi. Hasilnya bisa diunduh sebagai berkas HTML.</p>
              </div>
            )}
            {!g.error && g.raw && (
              <iframe
                title="Pratinjau media interaktif"
                srcDoc={g.raw}
                sandbox=""
                className="w-full h-[65vh] rounded-lg border border-line bg-white"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

// ============================================================
// VIEW: Infografis  (brief desain → Markdown)
// ============================================================
function InfografisView() {
  const notify = useToast()
  const g = useGenerator<InfografisInput>(generateInfografis)
  const [f, setF] = useState<InfografisInput>({
    judul: '',
    topik: '',
    tujuan: 'Edukasi',
    audiens: 'Umum',
    warna: 'Hijau Edukasi',
    referensi: '',
  })
  const set = <K extends keyof InfografisInput>(k: K, v: InfografisInput[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.judul || !f.topik) {
      notify('Lengkapi Judul dan Topik', 'error')
      return
    }
    g.run(f)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-96 shrink-0">
        <FormCard
          title="Konsep Infografis"
          desc="Susun brief isi infografis edukasi yang padat dan mudah dipindai."
          onSubmit={submit}
          submitLabel="Buat konsep AI"
          loading={g.loading}
        >
          <div>
            <Label required>Judul</Label>
            <input className={fieldCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} placeholder="Cth: Bahaya Serangan Phishing" />
          </div>
          <div>
            <Label required>Topik / Materi</Label>
            <textarea rows={2} className={`${fieldCls} resize-none`} value={f.topik} onChange={(e) => set('topik', e.target.value)} placeholder="Cth: Cara mengenali email penipuan dan langkah pencegahannya" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tujuan</Label>
              <input className={fieldCls} value={f.tujuan} onChange={(e) => set('tujuan', e.target.value)} placeholder="Cth: Edukasi" />
            </div>
            <div>
              <Label>Target Audiens</Label>
              <input className={fieldCls} value={f.audiens} onChange={(e) => set('audiens', e.target.value)} placeholder="Cth: Siswa SMA" />
            </div>
          </div>
          <div>
            <Label>Nuansa Warna Tema</Label>
            <select className={fieldCls} value={f.warna} onChange={(e) => set('warna', e.target.value)}>
              {['Hijau Edukasi', 'Biru Profesional', 'Merah Peringatan', 'Ungu Teknologi', 'Oranye Kreatif'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Referensi / Sumber Data</Label>
            <input className={fieldCls} value={f.referensi} onChange={(e) => set('referensi', e.target.value)} placeholder="Cth: Modul Keamanan Siber 2025" />
          </div>
        </FormCard>
      </aside>
      <section className="flex-1 min-w-0">
        <MarkdownResult
          {...g}
          filename={`Infografis_${slug(f.judul)}`}
          emptyTitle="Brief Desain Infografis"
          emptyDesc="Hasil berupa ringkasan utama, poin-poin kunci, data menonjol, dan alur visual — siap dituangkan ke desain. Bisa diunduh Word/PDF."
        />
      </section>
    </div>
  )
}

// ============================================================
// VIEW: Beranda (peluncur)
// ============================================================
const TABS: { id: string; label: string; desc: string }[] = [
  { id: 'modul', label: 'Modul Ajar', desc: 'RPP / Modul Ajar bergaya Pembelajaran Mendalam.' },
  { id: 'bahan', label: 'Bahan Ajar', desc: 'Materi bacaan siswa: uraian, latihan, glosarium.' },
  { id: 'media', label: 'Media Interaktif', desc: 'Presentasi HTML mandiri berikut kuis evaluasi.' },
  { id: 'asesmen', label: 'Asesmen', desc: 'Instrumen soal & rubrik lintas kurikulum.' },
  { id: 'infografis', label: 'Infografis', desc: 'Brief isi infografis edukasi yang padat.' },
]

function BerandaView({ go }: { go: (id: string) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => go(t.id)}
          className="text-left bg-cream-50 border border-line rounded-xl p-5 hover:border-forest-700 transition group"
        >
          <div className="font-display text-lg text-forest-800 group-hover:text-forest-600 transition mb-1">
            {t.label}
          </div>
          <p className="text-sm text-ink-500 leading-relaxed">{t.desc}</p>
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Root
// ============================================================
export default function PerangkatClient() {
  const [tab, setTab] = useState<string>('beranda')

  // Kembali ke atas tiap ganti tab (nyaman di mobile).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const allTabs = [{ id: 'beranda', label: 'Beranda' }, ...TABS]

  return (
    <ToastHost>
      {/* Styling hasil markdown. Tailwind v4 preflight menghapus style default
          heading/list/tabel, jadi kita atur ulang pakai token warna app. */}
      <style>{`
        .prose-perangkat { color: var(--color-ink-900); font-size: 0.925rem; line-height: 1.7; }
        .prose-perangkat > :first-child { margin-top: 0; }
        .prose-perangkat h1 { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.6rem; color: var(--color-forest-800); line-height: 1.2; margin: 0 0 .5em; }
        .prose-perangkat h2 { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.25rem; color: var(--color-forest-800); margin: 1.4em 0 .5em; padding-bottom: .3em; border-bottom: 1px solid var(--color-line); }
        .prose-perangkat h3 { font-weight: 600; color: var(--color-forest-700); margin: 1.1em 0 .4em; }
        .prose-perangkat p { margin: 0 0 .8em; }
        .prose-perangkat ul { list-style: disc; padding-left: 1.4em; margin: 0 0 .8em; }
        .prose-perangkat ol { list-style: decimal; padding-left: 1.4em; margin: 0 0 .8em; }
        .prose-perangkat li { margin: .25em 0; }
        .prose-perangkat strong { color: var(--color-forest-800); font-weight: 600; }
        .prose-perangkat em { font-style: italic; }
        .prose-perangkat table { border-collapse: collapse; width: 100%; margin: .4em 0 1em; font-size: .85rem; }
        .prose-perangkat th, .prose-perangkat td { border: 1px solid var(--color-line); padding: .5em .6em; text-align: left; vertical-align: top; }
        .prose-perangkat th { background: var(--color-cream-200); color: var(--color-forest-800); font-weight: 600; }
        .prose-perangkat hr { border: 0; border-top: 1px solid var(--color-line-strong); margin: 1.4em 0; }
        .prose-perangkat code { background: var(--color-cream-200); padding: .1em .35em; border-radius: 4px; font-size: .85em; }
        .prose-perangkat a { color: var(--color-copper-600); text-decoration: underline; }
        .prose-perangkat blockquote { border-left: 3px solid var(--color-line-strong); padding-left: 1em; color: var(--color-ink-700); margin: 0 0 .8em; }
      `}</style>

      {/* Tab bar horizontal (menggantikan sidebar EduCraft agar tidak dobel
          dengan sidebar super admin). */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {allTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? 'bg-forest-700 text-cream-50'
                : 'text-ink-700 border border-line hover:bg-cream-200/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'beranda' && <BerandaView go={setTab} />}
      {tab === 'modul' && <ModulView />}
      {tab === 'bahan' && <BahanView />}
      {tab === 'media' && <MediaView />}
      {tab === 'asesmen' && <AsesmenView />}
      {tab === 'infografis' && <InfografisView />}
    </ToastHost>
  )
}