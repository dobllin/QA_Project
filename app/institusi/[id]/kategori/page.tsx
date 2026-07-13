import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import KategoriClient from './kategori-client'

export default async function KategoriPage({
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

  if (!isAdmin) redirect(`/institusi/${institusiId}`)

  // Fetch: institusi, kategori, semua ustadz di institusi, semua santri di institusi, semua assignment
  const [
    { data: institusi },
    { data: kategori },
    { data: userInsts },
    { data: santriList },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from('institusi')
      .select('id, nama, jenis')
      .eq('id', institusiId)
      .single(),
    supabase
      .from('kategori')
      .select('id, nama')
      .eq('institusi_id', institusiId)
      .order('nama'),
    supabase
      .from('user_institusi')
      .select('user_id, peran, profiles:user_id(id, nama)')
      .eq('institusi_id', institusiId)
      .in('peran', ['ustadz', 'ustadzah']),
    supabase
      .from('santri')
      .select('id, nama, kelas, institusi_id')
      .eq('institusi_id', institusiId)
      .order('nama'),
    supabase
      .from('ustadz_santri')
      .select(
        'id, kategori_id, ustadz_id, santri_id, santri:santri_id(id, nama, kelas, institusi_id), ustadz:ustadz_id(id, nama)'
      ),
  ])

  if (!institusi) notFound()

  // Extract ustadz list
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

  // Grup assignment: kategori_id -> ustadz_id -> [assignment{id, santri}]
  type Assignment = {
    id: string
    kategori_id: number
    ustadz_id: string
    santri_id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    santri: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ustadz: any
  }

  const grouped = new Map<
    number,
    Map<
      string,
      {
        ustadzNama: string
        items: {
          assignmentId: string
          santriId: string
          santriNama: string
          santriKelas: string | null
        }[]
      }
    >
  >()

  for (const a of (assignments ?? []) as Assignment[]) {
    if (!a.santri || !a.ustadz) continue
    if (a.santri.institusi_id !== institusiId) continue

    if (!grouped.has(a.kategori_id)) grouped.set(a.kategori_id, new Map())
    const perUstadz = grouped.get(a.kategori_id)!

    if (!perUstadz.has(a.ustadz_id)) {
      perUstadz.set(a.ustadz_id, {
        ustadzNama: a.ustadz.nama ?? '—',
        items: [],
      })
    }
    perUstadz.get(a.ustadz_id)!.items.push({
      assignmentId: a.id,
      santriId: a.santri.id,
      santriNama: a.santri.nama,
      santriKelas: a.santri.kelas ?? null,
    })
  }

  const kategoriData = (kategori ?? []).map((k) => {
    const perUstadz = grouped.get(k.id)
    const assignedUstadzIds = perUstadz ? Array.from(perUstadz.keys()) : []
    const ustadzGroups = assignedUstadzIds
      .map((uid) => ({
        ustadzId: uid,
        ustadzNama: perUstadz!.get(uid)!.ustadzNama,
        items: perUstadz!.get(uid)!.items.sort((a, b) =>
          a.santriNama.localeCompare(b.santriNama)
        ),
      }))
      .sort((a, b) => a.ustadzNama.localeCompare(b.ustadzNama))

    const totalSantri = ustadzGroups.reduce((sum, u) => sum + u.items.length, 0)

    return {
      id: k.id,
      nama: k.nama,
      ustadzGroups,
      totalSantri,
      totalUstadz: ustadzGroups.length,
    }
  })

  return (
    <KategoriClient
      institusi={institusi}
      institusiId={institusiId}
      kategori={kategoriData}
      ustadzList={ustadzList}
      santriList={(santriList ?? []).map((s) => ({
        id: s.id,
        nama: s.nama,
        kelas: s.kelas ?? null,
      }))}
    />
  )
}