import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SantriClient from './santri-client'

type AssignmentRow = {
  santri_id: string
  kategori_id: number
  ustadz_id: string
}

export default async function SantriPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const institusiId = Number(id)
  if (!institusiId || Number.isNaN(institusiId)) redirect('/institusi')

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

  // Awal bulan (UTC, biar konsisten sama kolom `tanggal` yg disimpan UTC)
  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )
    .toISOString()
    .split('T')[0]

  const [{ data: institusi }, { data: allSantri }] = await Promise.all([
    supabase
      .from('institusi')
      .select('id, nama, jenis')
      .eq('id', institusiId)
      .single(),
    supabase
      .from('santri')
      .select('id, nama, kelas, halaqoh, tahun_masuk, poin, institusi_id')
      .eq('institusi_id', institusiId)
      .order('nama'),
  ])

  const institusiSantriIds = (allSantri ?? []).map((s) => s.id)

  // Assignment di-scope ke santri institusi ini aja.
  // (Versi lama: `.select('santri_id, kategori_id, ustadz_id')` tanpa filter —
  //  narik SEMUA pengampuan dari SEMUA institusi lalu difilter di JS.)
  let assignmentRows: AssignmentRow[] = []
  if (institusiSantriIds.length > 0) {
    let assignQuery = supabase
      .from('ustadz_santri')
      .select('santri_id, kategori_id, ustadz_id')
      .in('santri_id', institusiSantriIds)

    // Ustadz cuma butuh (dan cuma boleh lihat) pengampuan miliknya sendiri
    if (!isAdmin) assignQuery = assignQuery.eq('ustadz_id', user.id)

    const { data } = await assignQuery
    assignmentRows = (data ?? []) as AssignmentRow[]
  }

  // === SCOPING SANTRI ===
  // Admin  → semua santri institusi
  // Ustadz → cuma santri yang di-assign admin ke dia (lewat ustadz_santri)
  const mySantriIds = new Set(assignmentRows.map((a) => a.santri_id))
  const visibleSantri = isAdmin
    ? allSantri ?? []
    : (allSantri ?? []).filter((s) => mySantriIds.has(s.id))

  const kategoriPerSantri = new Map<string, Set<number>>()
  const ustadzPerSantri = new Map<string, Set<string>>()
  for (const a of assignmentRows) {
    if (!kategoriPerSantri.has(a.santri_id)) {
      kategoriPerSantri.set(a.santri_id, new Set())
    }
    kategoriPerSantri.get(a.santri_id)!.add(a.kategori_id)

    if (!ustadzPerSantri.has(a.santri_id)) {
      ustadzPerSantri.set(a.santri_id, new Set())
    }
    ustadzPerSantri.get(a.santri_id)!.add(a.ustadz_id)
  }

  const enrichedSantri = visibleSantri.map((s) => ({
    ...s,
    kategoriCount: kategoriPerSantri.get(s.id)?.size ?? 0,
    ustadzCount: ustadzPerSantri.get(s.id)?.size ?? 0,
  }))

  // === STATS: ikut scope juga ===
  let kategoriCount = 0
  let pengajarCount = 0
  let progresBulanIni = 0

  if (isAdmin) {
    const [{ count: katCount }, { data: userInsts }, { count: progresCount }] =
      await Promise.all([
        supabase
          .from('kategori')
          .select('*', { count: 'exact', head: true })
          .eq('institusi_id', institusiId),
        supabase
          .from('user_institusi')
          .select('user_id')
          .eq('institusi_id', institusiId)
          .in('peran', ['ustadz', 'ustadzah']),
        supabase
          .from('progress')
          .select('*', { count: 'exact', head: true })
          .eq('institusi_id', institusiId)
          .gte('tanggal', monthStart),
      ])

    kategoriCount = katCount ?? 0
    pengajarCount = new Set((userInsts ?? []).map((u) => u.user_id)).size
    progresBulanIni = progresCount ?? 0
  } else {
    // Ustadz: kategori yang dia ampu + setoran yang DIA input bulan ini
    const { count: progresCount } = await supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId)
      .eq('ustadz_id', user.id)
      .gte('tanggal', monthStart)

    kategoriCount = new Set(assignmentRows.map((a) => a.kategori_id)).size
    progresBulanIni = progresCount ?? 0
  }

  const avgPoin =
    enrichedSantri.length > 0
      ? Math.round(
          enrichedSantri.reduce((sum, s) => sum + (s.poin ?? 100), 0) /
            enrichedSantri.length
        )
      : 100

  const stats = {
    santriCount: enrichedSantri.length,
    kategoriCount,
    pengajarCount,
    progresBulanIni,
    avgPoin,
  }

  return (
    <SantriClient
      santri={enrichedSantri}
      stats={stats}
      institusi={institusi ?? { id: institusiId, nama: '', jenis: '' }}
      institusiId={institusiId}
      isAdmin={isAdmin}
    />
  )
}