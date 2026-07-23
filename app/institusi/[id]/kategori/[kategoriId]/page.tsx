import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import SetoranClient from './setoran-client'

type ProgresType = 'tahfiz' | 'kitab' | 'iqro' | 'other'

function getProgresType(kategoriNama: string): ProgresType {
  const lower = kategoriNama.toLowerCase()
  if (lower.includes('kitab')) return 'kitab'
  if (lower.includes('iqro') || lower.includes('iqra')) return 'iqro'
  if (
    lower.includes('tahfiz') ||
    lower.includes('hafalan') ||
    lower.includes('quran') ||
    lower.includes('surat') ||
    lower.includes('murojaah')
  )
    return 'tahfiz'
  return 'other'
}

export default async function KategoriSetoranPage({
  params,
}: {
  params: Promise<{ id: string; kategoriId: string }>
}) {
  const { id, kategoriId: kategoriIdRaw } = await params
  const institusiId = Number(id)
  const kategoriId = Number(kategoriIdRaw)

  if (!institusiId || Number.isNaN(institusiId)) redirect('/institusi')
  if (!kategoriId || Number.isNaN(kategoriId)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  let isAdmin = profile?.is_super_admin ?? false
  if (!isAdmin) {
    const { data: adminCheck } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .eq('peran', 'admin')
    isAdmin = (adminCheck?.length ?? 0) > 0
  }

  // CATATAN: semua query di halaman ini sengaja TANPA embed (gak ada
  // `kategori(...)`, `profiles:ustadz_id(...)`, `custom_fields`). Embed yang
  // gagal bikin data balik null tanpa suara, itu yang bikin halaman detail
  // santri kena notFound()/404. Di sini ambil terpisah + error-nya dilog.
  const { data: kategori, error: katError } = await supabase
    .from('kategori')
    .select('id, nama, target, institusi_id')
    .eq('id', kategoriId)
    .eq('institusi_id', institusiId)
    .maybeSingle()

  if (katError) {
    console.error('[kategori setoran] gagal ambil kategori:', katError.message)
  }
  if (!kategori) notFound()

  // Santri di kategori ini. Ustadz → cuma ampuan dia. Admin → semua.
  let assignQuery = supabase
    .from('ustadz_santri')
    .select('santri_id')
    .eq('kategori_id', kategoriId)

  if (!isAdmin) assignQuery = assignQuery.eq('ustadz_id', user.id)

  const { data: assignments, error: assignError } = await assignQuery
  if (assignError) {
    console.error(
      '[kategori setoran] gagal ambil pengampuan:',
      assignError.message
    )
  }

  const santriIds = Array.from(
    new Set((assignments ?? []).map((a) => a.santri_id))
  )

  type SantriRow = { id: string; nama: string; kelas: string | null }
  let santriRows: SantriRow[] = []
  if (santriIds.length > 0) {
    const { data, error } = await supabase
      .from('santri')
      .select('id, nama, kelas')
      .in('id', santriIds)
      .eq('institusi_id', institusiId)
      .order('nama')
    if (error) {
      console.error('[kategori setoran] gagal ambil santri:', error.message)
    }
    santriRows = (data ?? []) as SantriRow[]
  }

  const hariIni = new Date().toISOString().split('T')[0]
  let doneSet = new Set<string>()
  if (santriIds.length > 0) {
    const { data: todayProgres, error: progError } = await supabase
      .from('progress')
      .select('santri_id')
      .eq('kategori_id', kategoriId)
      .eq('tanggal', hariIni)
      .in('santri_id', santriIds)
    if (progError) {
      console.error(
        '[kategori setoran] gagal ambil setoran hari ini:',
        progError.message
      )
    }
    doneSet = new Set((todayProgres ?? []).map((p) => p.santri_id))
  }

  const santri = santriRows.map((s) => ({
    id: s.id,
    nama: s.nama,
    kelas: s.kelas ?? null,
    done: doneSet.has(s.id),
  }))

  const doneCount = santri.filter((s) => s.done).length

  return (
    <div>
      <Link
        href={`/institusi/${institusiId}/kategori`}
        className="text-xs text-ink-500 hover:text-forest-800 transition"
      >
        ← Kategori saya
      </Link>

      <div className="mt-4 mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Input setoran · {hariIni}
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          {kategori.nama}
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          {santri.length} santri yang kamu ampu di kategori ini. Klik nama santri
          untuk isi absen dan setoran hari ini.
        </p>
      </div>

      {kategori.target && (
        <div className="mb-6 rounded-xl border border-forest-700/25 bg-cream-100 p-4">
          <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1">
            Target dari admin
          </div>
          <p className="text-sm text-ink-900">{kategori.target}</p>
        </div>
      )}

      <div className="divider-double mb-8" />

      {santri.length > 0 && (
        <div
          className={`mb-8 rounded-xl border p-4 ${
            doneCount === santri.length
              ? 'border-success-500/30 bg-success-500/10'
              : 'border-copper-500/30 bg-copper-500/10'
          }`}
        >
          <div className="text-sm font-medium text-ink-900">
            {doneCount === santri.length
              ? `Beres — ${doneCount}/${santri.length} sudah diisi hari ini`
              : `${santri.length - doneCount} dari ${
                  santri.length
                } belum diisi hari ini`}
          </div>
        </div>
      )}

      {santri.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Belum ada santri yang ditugaskan ke kamu di kategori ini. Hubungi
            admin institusi.
          </p>
        </div>
      ) : (
        <SetoranClient
          institusiId={institusiId}
          kategoriId={kategori.id}
          progresType={getProgresType(kategori.nama)}
          santri={santri}
        />
      )}
    </div>
  )
}