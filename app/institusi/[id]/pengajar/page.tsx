import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PengajarClient from './pengajar-client'

export default async function PengajarPage({
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
    const { data: adminCheck } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .eq('peran', 'admin')
    isAdmin = (adminCheck?.length ?? 0) > 0
  }

  // Fetch ustadz/ustadzah di institusi ini
  const { data: userInsts } = await supabase
    .from('user_institusi')
    .select('user_id, peran, profiles(id, nama)')
    .eq('institusi_id', institusiId)
    .in('peran', ['ustadz', 'ustadzah'])

  const ustadzIds = userInsts?.map((u) => u.user_id) ?? []

  // Fetch semua assignment ustadz_santri untuk ustadz-ustadz di institusi ini
  const { data: assignments } = ustadzIds.length
    ? await supabase
        .from('ustadz_santri')
        .select(
          `
          id, ustadz_id, santri_id, kategori_id,
          santri(id, nama, kelas, institusi_id),
          kategori(id, nama, institusi_id)
        `
        )
        .in('ustadz_id', ustadzIds)
    : { data: [] }

  // Filter yang santri-nya di institusi ini
  const relevantAssignments = (assignments ?? []).filter((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = a.santri as any
    return s?.institusi_id === institusiId
  })

  // Fetch semua santri di institusi ini
  const { data: allSantri } = await supabase
    .from('santri')
    .select('id, nama, kelas')
    .eq('institusi_id', institusiId)
    .order('nama')

  // Fetch semua kategori di institusi ini
  const { data: kategori } = await supabase
    .from('kategori')
    .select('id, nama')
    .eq('institusi_id', institusiId)
    .order('nama')

  // Enrich ustadz dengan assignments mereka
  const ustadzList =
    userInsts?.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = u.profiles as any
      const myAssignments = relevantAssignments
        .filter((a) => a.ustadz_id === u.user_id)
        .map((a) => ({
          id: a.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          santri: a.santri as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          kategori: a.kategori as any,
        }))
      return {
        id: u.user_id,
        nama: p?.nama ?? '(tanpa nama)',
        peran: u.peran,
        assignments: myAssignments,
      }
    }) ?? []

  return (
    <PengajarClient
      ustadzList={ustadzList}
      santriList={allSantri ?? []}
      kategoriList={kategori ?? []}
      institusiId={institusiId}
      isAdmin={isAdmin}
    />
  )
}