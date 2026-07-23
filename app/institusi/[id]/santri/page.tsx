import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SantriClient from './santri-client'

export default async function SantriPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const institusiId = Number(id)

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
    const { data: assignments } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .eq('peran', 'admin')
    isAdmin = (assignments?.length ?? 0) > 0
  }

  const monthStart = new Date(new Date().setDate(1))
    .toISOString()
    .split('T')[0]

  const [
    { data: institusi },
    { data: santri },
    { count: kategoriCount },
    { data: userInsts },
    { data: assignments },
    { count: progresBulanIni },
  ] = await Promise.all([
    supabase
      .from('institusi')
      .select('id, nama, jenis')
      .eq('id', institusiId)
      .single(),
    supabase
      .from('santri')
      .select('id, nama, kelas, halaqoh, tahun_masuk, poin, institusi_id, wali_kelas_id')
      .eq('institusi_id', institusiId)
      .order('nama'),
    supabase
      .from('kategori')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId),
    supabase
      .from('user_institusi')
      .select('user_id, peran, profiles:user_id(id, nama)')
      .eq('institusi_id', institusiId)
      .in('peran', ['ustadz', 'ustadzah']),
    supabase.from('ustadz_santri').select('santri_id, kategori_id, ustadz_id'),
    supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId)
      .gte('tanggal', monthStart),
  ])

  const santriIds = new Set((santri ?? []).map((s) => s.id))
  const relevantAssignments = (assignments ?? []).filter((a) =>
    santriIds.has(a.santri_id)
  )

  const kategoriPerSantri = new Map<string, Set<number>>()
  const ustadzPerSantri = new Map<string, Set<string>>()
  for (const a of relevantAssignments) {
    if (!kategoriPerSantri.has(a.santri_id))
      kategoriPerSantri.set(a.santri_id, new Set())
    kategoriPerSantri.get(a.santri_id)!.add(a.kategori_id)
    if (!ustadzPerSantri.has(a.santri_id))
      ustadzPerSantri.set(a.santri_id, new Set())
    ustadzPerSantri.get(a.santri_id)!.add(a.ustadz_id)
  }

  const enrichedSantri = (santri ?? []).map((s) => ({
    ...s,
    kategoriCount: kategoriPerSantri.get(s.id)?.size ?? 0,
    ustadzCount: ustadzPerSantri.get(s.id)?.size ?? 0,
  }))

  const uniqueUstadz = new Set((userInsts ?? []).map((u) => u.user_id)).size

  // Build ustadz list buat dropdown wali kelas
  type UInst = {
    user_id: string
    peran: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles: any
  }
  const ustadzList = ((userInsts ?? []) as UInst[])
    .filter((u) => u.profiles?.nama)
    .map((u) => ({
      id: u.user_id,
      nama: u.profiles.nama as string,
      peran: u.peran as 'ustadz' | 'ustadzah',
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama))

  const avgPoin =
    enrichedSantri.length > 0
      ? Math.round(
          enrichedSantri.reduce((sum, s) => sum + (s.poin ?? 100), 0) /
            enrichedSantri.length
        )
      : 100

  const stats = {
    santriCount: enrichedSantri.length,
    kategoriCount: kategoriCount ?? 0,
    pengajarCount: uniqueUstadz,
    progresBulanIni: progresBulanIni ?? 0,
    avgPoin,
  }

  return (
    <SantriClient
      santri={enrichedSantri}
      stats={stats}
      institusi={institusi ?? { id: institusiId, nama: '', jenis: '' }}
      institusiId={institusiId}
      isAdmin={isAdmin}
      ustadzList={ustadzList}
    />
  )
}