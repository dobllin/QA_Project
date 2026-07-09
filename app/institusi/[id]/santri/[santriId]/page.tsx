import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SantriDetailClient from './santri-detail-client'

export default async function SantriDetailPage({
  params,
}: {
  params: Promise<{ id: string; santriId: string }>
}) {
  const { id, santriId } = await params
  const institusiId = Number(id)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: santri } = await supabase
    .from('santri')
    .select(
      'id, nama, kelas, halaqoh, tahun_masuk, poin, institusi_id, institusi(jenis)'
    )
    .eq('id', santriId)
    .eq('institusi_id', institusiId)
    .single()

  if (!santri) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const institusiJenis = (santri.institusi as any)?.jenis ?? ''
  const isPondok = institusiJenis === 'PONPES'

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

  let query = supabase
    .from('ustadz_santri')
    .select(
      'kategori_id, ustadz_id, kategori(id, nama), profiles:ustadz_id(nama)'
    )
    .eq('santri_id', santriId)

  if (!isAdmin) {
    query = query.eq('ustadz_id', user.id)
  }

  const { data: assignments } = await query

  if (!assignments || assignments.length === 0) {
    notFound()
  }

  const kategoriMap = new Map<
    number,
    { id: number; nama: string; ustadzNames: string[] }
  >()
  for (const a of assignments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = a.kategori as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = a.profiles as any
    if (!k) continue
    if (!kategoriMap.has(k.id)) {
      kategoriMap.set(k.id, { id: k.id, nama: k.nama, ustadzNames: [] })
    }
    if (u?.nama) {
      kategoriMap.get(k.id)!.ustadzNames.push(u.nama)
    }
  }
  const kategoriList = Array.from(kategoriMap.values())

  let progressQuery = supabase
    .from('progress')
    .select(
      `
      id, tanggal, kategori_id, ustadz_id,
      jenis_setoran, lancar,
      surah_mulai, ayat_mulai, surah_selesai, ayat_selesai,
      kitab_nama, bab, halaman_mulai, halaman_selesai,
      absen, kendala, tersampaikan,
      iqro_jilid, iqro_halaman,
      kualitas, catatan,
      profiles:ustadz_id(nama)
    `
    )
    .eq('santri_id', santriId)
    .order('tanggal', { ascending: false })
    .limit(100)

  if (!isAdmin) {
    progressQuery = progressQuery.eq('ustadz_id', user.id)
  }

  const { data: progressHistory } = await progressQuery

  // Fetch poin log HANYA kalau Pondok
  const poinLog = isPondok
    ? (
        await supabase
          .from('poin_log')
          .select(
            'id, jenis, nilai_perubahan, keterangan, tanggal, ustadz_id, profiles:ustadz_id(nama)'
          )
          .eq('santri_id', santriId)
          .order('created_at', { ascending: false })
          .limit(20)
      ).data ?? []
    : []

  return (
    <SantriDetailClient
      santri={santri}
      kategoriList={kategoriList}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progressHistory={(progressHistory ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      poinLog={poinLog as any}
      institusiId={institusiId}
      isAdmin={isAdmin}
      isPondok={isPondok}
    />
  )
}