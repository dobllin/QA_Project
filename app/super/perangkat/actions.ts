'use server'

// ============================================================
// FILE: app/super/perangkat/actions.ts
//
// Semua panggilan ke Gemini dilakukan DI SERVER lewat file ini.
// Alasan:
//   1. API key TIDAK pernah keluar ke browser (baca dari env server).
//   2. Tiap request diverifikasi ulang: hanya super admin yang boleh.
//   3. Kalau gagal, fungsi ini MELEMPAR error (throw) — jadi UI bisa
//      bener-bener bedain "berhasil" vs "gagal" (beda dari versi lama
//      yang selalu balik string sukses walau error).
//
// ENV yang dibutuhkan (set di .env.local & Environment Variables Vercel):
//   GEMINI_API_KEY   -> wajib. Ambil di https://aistudio.google.com/apikey
//   GEMINI_MODEL     -> opsional. Default di bawah.
// ============================================================

import { createClient } from '@/utils/supabase/server'

const DEFAULT_MODEL = 'gemini-flash-latest'

// ------------------------------------------------------------
// Guard: pastikan pemanggil adalah super admin.
// Layout /super sudah menjaga halaman, tapi server action bisa
// dipanggil langsung — jadi kita cek ulang di sini.
// ------------------------------------------------------------
async function assertSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Sesi habis. Silakan masuk ulang.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    throw new Error('Akses ditolak. Halaman ini khusus super admin.')
  }
}

// ------------------------------------------------------------
// Pemanggil Gemini generik.
// ------------------------------------------------------------
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY belum di-set di server. Tambahkan di .env.local lalu restart, atau di Environment Variables Vercel.'
    )
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  console.log('[PERANGKAT] pakai model:', model)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Gagal menghubungi layanan AI. Cek koneksi lalu coba lagi.')
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // 400 sering berarti nama model salah / key tidak valid.
    throw new Error(
      `Layanan AI menolak permintaan (${res.status}). ${detail.slice(0, 300)}`
    )
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('AI tidak mengembalikan teks. Coba ulangi permintaan.')
  }
  return text as string
}

// ============================================================
// 1. MODUL AJAR  (prompt asli EduCraft — dipertahankan apa adanya)
// ============================================================
export type ModulInput = {
  subject: string
  jenjang: string
  kelas: string
  jurusan?: string
  topic: string
  pertemuan: string
  alokasi?: string
  learningModel: string
  objectives: string
  additionalContext?: string
}

const SYS_MODUL = `Anda adalah seorang Ahli Pendidikan dan Guru Penggerak yang menguasai penyusunan Modul Ajar (RPP) berbasis "Perencanaan Pembelajaran Mendalam" Kurikulum Merdeka.
Tugas Anda adalah merancang Modul Ajar yang sangat terstruktur, berpusat pada peserta didik, kontekstual, dan mengutamakan pemahaman bermakna.

Anda HARUS menghasilkan dokumen berformat Markdown dengan struktur PERSIS seperti template berikut ini (jangan gunakan struktur generik):

# [Pilih satu Judul Menarik & Filosofis yang mewakili topik]
## ~ [Topik / Materi Spesifik] ~

| | |
|---|---|
| **Mata Pelajaran** | [Mapel] |
| **Kelas** | [Fase dan Kelas] |
| **Materi** | [Topik] |
| **Pertemuan** | [Alokasi Waktu] |
| **Dimensi Profil Lulusan** | [Sebutkan 3 dimensi P3 yang relevan] |
| **Lintas Disiplin Ilmu** | [Contoh kaitan dengan mapel lain] |
| **Kompetensi Awal** | [Pengetahuan prasyarat] |
| **Tujuan Pembelajaran** | [Tujuan yang bisa diukur] |
| **Pengetahuan Bermakna** | [Kalimat penjelasan urgensi materi] |
| **Komponen Kerangka Pembelajaran** | **Praktik Pedagogis:** [Pendekatan]. <br><br> **Lingkungan Pembelajaran:** [Interaksi]. <br><br> **Pemanfaatan Digital:** [Teknologi]. |

---

## Pertemuan Pertama (Dari Konsep ke Kehidupan Nyata)
**Memahami [menggembirakan]**
1. [Aktivitas pembuka interaktif].
2. [Eksplorasi penggunaan alat].
3. [Diskusi penerapan materi].
4. [Tanya jawab studi kasus pemantik].
5. [Eksplorasi pembuatan alat peraga].
6. [Penutup].

---

## Pertemuan Kedua (Studi Kasus)
**Mengaplikasi [bermakna, menggembirakan]**
1. [Aktivitas pembuatan karya/praktik].
2. [Diskusi kendala ekstrem (HOTS)].
3. Sajikan contoh studi kasus:
   - **Contoh Studi Kasus A:** [Kasus kontekstual di lingkungan sekolah]
   - **Contoh Studi Kasus B:** [Kasus profesi spesifik di luar sekolah]
   - **Contoh Studi Kasus C:** [Kasus investigasi darurat]
4. [Aktivitas siswa mencatat observasi].
5. [Aktivitas estimasi logis].
6. [Analisis masalah].

---

## Pertemuan Ketiga (Pembahasan Soal dan Formatif)
1. **Gallery Walk:** [Apresiasi silang antar kelompok].
2. [Pembahasan variasi soal tajam].
3. [Pelaksanaan Asesmen Formatif].

**Rubrik Penilaian Formatif:**
| Kategori Pemahaman | Kriteria |
|---|---|
| **Mulai Memahami** | [Kriteria belum tuntas] |
| **Cukup Memahami** | [Kriteria hampir tuntas] |
| **Sangat Memahami** | [Kriteria sempurna] |

**Rencana Tindak Lanjut:**
- **Mulai Memahami:** [Strategi remedial]
- **Cukup Memahami:** [Pengayaan konteks]
- **Sangat Memahami:** [Soal tantangan HOTS]

---

## Pertemuan Keempat (Asesmen Sumatif & Refleksi)
1. [Tanya jawab pemantapan].
2. [Pelaksanaan Asesmen Sumatif].

**Merefleksi [berkesadaran & bermakna]**
3. Proses refleksi:
   - [Pertanyaan refleksi 1]
   - [Pertanyaan refleksi 2]
   - [Pertanyaan refleksi 3]
   - [Pertanyaan refleksi 4]
   - [Pertanyaan refleksi 5]

---

**Daftar Pustaka:**
- [Beri 2 atau 3 contoh daftar pustaka relevan]`

export async function generateModulAjar(input: ModulInput): Promise<string> {
  await assertSuperAdmin()

  let jenjangStr = input.jenjang
  if (input.jenjang === 'SMK' && input.jurusan) {
    jenjangStr += ` (Jurusan: ${input.jurusan})`
  }

  let userQuery = `Buatkan RPP / Modul Ajar Mendalam berdasarkan data ini:\n\n`
  userQuery += `- Mata Pelajaran: ${input.subject}\n`
  userQuery += `- Fase / Kelas: ${jenjangStr} - Kelas ${input.kelas}\n`
  userQuery += `- Topik / Materi Pokok: ${input.topic}\n`
  userQuery += `- Alokasi / Pertemuan: ${input.pertemuan} Pertemuan (${input.alokasi || 'Belum ditentukan'})\n`
  userQuery += `- Pendekatan Pedagogis: ${input.learningModel}\n`
  userQuery += `- Tujuan Utama: ${input.objectives}\n`
  if (input.additionalContext) {
    userQuery += `- Fokus Kasus Nyata / Tambahan: ${input.additionalContext}\n`
  }
  userQuery += `\nPASTIKAN format output menggunakan struktur Markdown persis seperti template Sistem.`

  return callGemini(SYS_MODUL, userQuery)
}

// ============================================================
// 2. BAHAN AJAR  (prompt asli EduCraft — dipertahankan apa adanya)
// ============================================================
export type BahanInput = {
  subject: string
  phase: string
  topic: string
  duration: string
  objectives: string
}

const SYS_BAHAN = `Anda adalah seorang ahli pembuat bahan ajar (modul materi utama) yang terstruktur dan mudah dipahami untuk pendidikan di Indonesia. Sesuaikan gaya bahasa dan kedalaman materi dengan tingkatan usia siswa (SD, SMP/MTs, atau SMA/MA/SMK).

Anda HARUS menghasilkan dokumen berformat Markdown dengan struktur dan urutan baku PERSIS seperti template berikut ini (tanpa perlu ditambahkan struktur lain):

# Kegiatan Belajar: [Judul Bahan Ajar Sesuai Topik]
**Mata Pelajaran:** [Mata Pelajaran]
**Fase/Kelas:** [Fase/Kelas]
**Alokasi Waktu:** [Alokasi Waktu]

---

## PENDAHULUAN
[Tuliskan paragraf pengantar/apersepsi yang memikat minat siswa, sesuaikan dengan kehidupan sehari-hari mereka]

## TUJUAN
[Tuliskan daftar tujuan pembelajaran secara ringkas dalam bentuk poin]

## URAIAN MATERI
[Berikan penjelasan materi secara lengkap, mendalam, dan terstruktur. Gunakan sub-judul (###) untuk memecah materi agar lebih rapi. Berikan contoh yang kontekstual dan relevan.]

## RANGKUMAN
[Tuliskan ringkasan singkat dari poin-poin terpenting yang baru saja dibahas di bagian Uraian Materi]

## LATIHAN
[Buat beberapa butir (3-5 soal) latihan esai atau diskusi pemecahan masalah (Problem solving) untuk menguji penguasaan konsep]

## TES FORMATIF
[Buat beberapa butir (5 soal) pertanyaan pilihan ganda (A, B, C, D) yang bervariasi dari tingkat LOTS hingga HOTS. Sediakan KUNCI JAWABAN di bawahnya yang disembunyikan dalam spoiler atau ditulis terpisah]

## GLOSARIUM
[Daftar istilah penting yang muncul di materi beserta definisinya]

## DAFTAR PUSTAKA
[Saran 2-3 referensi daftar pustaka buku atau literatur web yang relevan]`

export async function generateBahanAjar(input: BahanInput): Promise<string> {
  await assertSuperAdmin()

  let userQuery = `Tolong buatkan Bahan Ajar berdasarkan parameter berikut:\n\n`
  userQuery += `- Mata Pelajaran: ${input.subject}\n`
  userQuery += `- Fase / Kelas: ${input.phase}\n`
  userQuery += `- Topik / Judul: ${input.topic}\n`
  userQuery += `- Alokasi Waktu: ${input.duration}\n`
  userQuery += `- Tujuan Utama: ${input.objectives}\n`
  userQuery += `\nPASTIKAN struktur dokumen sama persis dengan urutan: Pendahuluan, Tujuan, Uraian Materi, Rangkuman, Latihan, Tes Formatif, Glosarium, Daftar Pustaka.`

  return callGemini(SYS_BAHAN, userQuery)
}

// ============================================================
// 3. ASESMEN  (prompt asli EduCraft — dipertahankan apa adanya)
// ============================================================
export type AsesmenInput = {
  sekolah?: string
  guru?: string
  alokasi?: string
  kurikulum: string
  jenjang: string
  mapel: string
  materi: string
  tp: string
  tipe: string
  bentuk: string
  jumlah: string
  kesulitan: string[]
  bloom: string
  kunci: string
}

const TIPE_TES_TERTULIS = [
  'Kuis Singkat',
  'Ulangan Harian/Tes Akhir Bab',
  'Ujian Tengah Semester',
  'Ujian Akhir Semester',
]

function getFase(kelas: string): string {
  if (['Kelas 1', 'Kelas 2'].includes(kelas)) return 'Fase A'
  if (['Kelas 3', 'Kelas 4'].includes(kelas)) return 'Fase B'
  if (['Kelas 5', 'Kelas 6'].includes(kelas)) return 'Fase C'
  if (['Kelas 7', 'Kelas 8', 'Kelas 9'].includes(kelas)) return 'Fase D'
  if (kelas === 'Kelas 10') return 'Fase E'
  if (['Kelas 11', 'Kelas 12'].includes(kelas)) return 'Fase F'
  return ''
}

const SYS_ASESMEN =
  'Anda adalah asisten AI guru profesional Indonesia. Selalu berikan instrumen penilaian berformat profesional dalam Bahasa Indonesia.'

export async function generateAsesmen(input: AsesmenInput): Promise<string> {
  await assertSuperAdmin()

  const isTesTertulis = TIPE_TES_TERTULIS.includes(input.tipe)
  const kesulitan = Array.isArray(input.kesulitan) ? input.kesulitan : []

  const promptInstruksi = `Anda adalah seorang ahli pembuat kurikulum dan instrumen asesmen standar nasional pendidikan Indonesia (Kurikulum Merdeka dan Kurikulum 2013).
Buatkan lembar instrumen asesmen yang rapi, profesional, dan siap pakai untuk guru berdasarkan informasi berikut ini:
 
Identitas Instansi:
- Nama Sekolah: ${input.sekolah || 'SMA Negeri 1 Jakarta'}
- Nama Guru Pengampu: ${input.guru || 'Guru Mata Pelajaran'}
- Alokasi Waktu: ${input.alokasi ? input.alokasi + ' Menit' : 'Sesuai durasi yang diinstruksikan pengawas'}
 
Detail Kurikulum:
- Kerangka Kurikulum: ${input.kurikulum}
- Jenjang & Kelas: ${input.jenjang}
- Fase: ${input.kurikulum === 'K13' ? 'Tidak berlaku' : getFase(input.jenjang)}
- Mata Pelajaran: ${input.mapel}
- Materi Pokok: ${input.materi}
- ${input.kurikulum === 'K13' ? 'Kompetensi Dasar (KD) / Indikator (IPK)' : 'Tujuan Pembelajaran (TP)'}: ${input.tp}
 
Spesifikasi Instrumen:
- Jenis Asesmen Terpilih: ${input.tipe}
- Bentuk Asesmen / Format Soal: ${input.bentuk || '-'}
- Jumlah Soal: ${isTesTertulis ? input.jumlah : '-'}
- Tingkat Kesulitan (Kombinasi): ${isTesTertulis ? kesulitan.join(', ') : '-'}
- Target Kognitif Bloom: ${isTesTertulis ? input.bloom : '-'}
- Lampirkan Kunci Jawaban / Pedoman Penskoran: ${input.kunci === 'ya' ? 'YA' : 'TIDAK'}
 
Aturan Format Output:
1. JANGAN gunakan tag HTML/CSS rumit. Gunakan format markdown bersih dengan spasi ganda untuk baris baru.
2. Jika Jenis Asesmen adalah kuis/ujian tertulis:
   - Buatkan soal sesuai bentuk yang dipilih. Untuk "Menjodohkan", WAJIB gunakan tabel Markdown.
   - Sertakan Total Skor Maksimal dan Rumus Nilai Akhir.
   - Jika meminta kunci jawaban, letakkan di bagian akhir setelah garis (---).
3. Jika Jenis Asesmen berupa observasi/penilaian diri/tanya jawab/proyek:
   - Buatkan rubrik penilaian, lembar observasi, atau panduan guru menggunakan tabel Markdown.
Gunakan bahasa Indonesia yang baku dan komunikatif.`

  return callGemini(SYS_ASESMEN, promptInstruksi)
}

// ============================================================
// 4. MEDIA INTERAKTIF  (prompt REKONSTRUKSI — bukan dari kode asli)
//
//   Kode asli untuk view ini tidak ikut ke-paste, jadi prompt di bawah
//   gua susun ulang dari tampilan screenshot. Kalau nanti ketemu prompt
//   aslinya, cukup ganti isi SYS_MEDIA ini — sisanya nggak perlu diubah.
//
//   Output: satu halaman HTML mandiri (bukan markdown).
// ============================================================
export type MediaInput = {
  jenjang: string
  kelas: string
  mapel: string
  topik: string
  capaian?: string
  kerangka?: string
  jumlahSoal: string
}

const SYS_MEDIA = `Anda adalah perancang media pembelajaran interaktif berbasis "Deep Learning" untuk pendidikan Indonesia.
Tugas Anda: mengubah instruksi singkat guru menjadi SATU halaman presentasi HTML mandiri yang mendalam, rapi, dan siap tayang di browser.

ATURAN OUTPUT (WAJIB):
1. Keluarkan HANYA kode HTML lengkap yang valid (mulai dari <!DOCTYPE html> sampai </html>). Jangan bungkus dengan blok kode markdown, jangan beri penjelasan di luar HTML.
2. Seluruh CSS ditulis inline di dalam tag <style> pada <head>. Jangan pakai library/CDN eksternal apa pun. Jangan pakai JavaScript yang memanggil jaringan.
3. Gunakan gambar ilustrasi open-source lewat URL Wikimedia Commons / Unsplash source yang relevan dengan topik. Jika ragu keandalan gambar, gunakan blok placeholder berwarna dengan keterangan, bukan tautan yang mungkin mati.
4. Susun sebagai rangkaian "slide" atau section vertikal: Judul & tujuan, Apersepsi, Uraian konsep (beberapa bagian dengan sub-judul), Contoh/analogi kontekstual, Ringkasan visual.
5. Di bagian akhir, sertakan blok "Evaluasi" berisi soal pilihan ganda interaktif sejumlah yang diminta. Untuk interaktivitas, cukup gunakan elemen <details>/<summary> HTML murni sebagai pengungkap kunci jawaban (tanpa JavaScript jaringan).
6. Desain harus responsif dan enak dibaca di layar HP: font memadai, kontras baik, spasi lega, sudut membulat.

Bahasa: Indonesia baku yang komunikatif dan sesuai jenjang.`

export async function generateMediaInteraktif(input: MediaInput): Promise<string> {
  await assertSuperAdmin()

  let userQuery = `Buatkan media pembelajaran interaktif (HTML) dengan parameter:\n\n`
  userQuery += `- Jenjang: ${input.jenjang}\n`
  userQuery += `- Kelas: ${input.kelas}\n`
  userQuery += `- Mata Pelajaran / Mata Kuliah: ${input.mapel}\n`
  userQuery += `- Topik Bahasan: ${input.topik}\n`
  if (input.capaian) userQuery += `- Capaian Pembelajaran (hasil akhir yang diukur): ${input.capaian}\n`
  if (input.kerangka) userQuery += `- Kerangka teori singkat dari guru (kembangkan jadi materi utuh): ${input.kerangka}\n`
  userQuery += `- Jumlah Soal Evaluasi: ${input.jumlahSoal}\n`
  userQuery += `\nIngat: keluarkan HANYA satu dokumen HTML lengkap sesuai aturan Sistem.`

  const html = await callGemini(SYS_MEDIA, userQuery)
  // Bersihkan kalau model terlanjur membungkus dengan ```html ... ```
  return html
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

// ============================================================
// 5. INFOGRAFIS  (prompt REKONSTRUKSI — bukan dari kode asli)
//
//   Sama seperti Media Interaktif: prompt disusun ulang dari screenshot
//   + fungsi export asli. Output berupa brief desain berformat Markdown
//   yang lalu dirender & diekspor jadi gambar/PDF di sisi klien.
// ============================================================
export type InfografisInput = {
  judul: string
  topik: string
  tujuan: string
  audiens: string
  warna: string
  referensi?: string
}

const SYS_INFOGRAFIS = `Anda adalah desainer komunikasi visual dan ahli infografis edukasi.
Tugas Anda: menyusun BRIEF ISI infografis edukasi yang padat, terstruktur, dan langsung bisa dituangkan ke desain.

ATURAN OUTPUT:
1. Format Markdown bersih. Jangan pakai HTML.
2. Struktur baku:
   # [Judul Infografis yang kuat dan ringkas]
   ## Ringkasan Utama
   [1-2 kalimat inti pesan]
   ## Poin-Poin Kunci
   - [gunakan 4-6 poin, tiap poin ringkas dan bisa berdiri sendiri]
   ## Data / Fakta Menonjol
   - [2-4 angka atau fakta yang layak ditonjolkan sebagai highlight visual]
   ## Alur Visual yang Disarankan
   [uraikan urutan bagian dari atas ke bawah, singkat]
   ## Ajakan / Kesimpulan
   [satu kalimat penutup yang menempel]
3. Bahasa Indonesia, tegas, dan sesuai audiens sasaran.
4. Ringkas — infografis harus mudah dipindai, bukan artikel.`

export async function generateInfografis(input: InfografisInput): Promise<string> {
  await assertSuperAdmin()

  let userQuery = `Susun brief isi infografis dengan parameter:\n\n`
  userQuery += `- Judul: ${input.judul}\n`
  userQuery += `- Topik / Materi: ${input.topik}\n`
  userQuery += `- Tujuan: ${input.tujuan}\n`
  userQuery += `- Target Audiens: ${input.audiens}\n`
  userQuery += `- Nuansa Warna Tema: ${input.warna}\n`
  if (input.referensi) userQuery += `- Referensi / Sumber Data: ${input.referensi}\n`
  userQuery += `\nIkuti struktur baku dari Sistem.`

  return callGemini(SYS_INFOGRAFIS, userQuery)
}