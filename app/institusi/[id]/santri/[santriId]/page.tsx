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
      'kategori_id, ustadz_id, kategori(id, nama, custom_fields), profiles:ustadz_id(nama)'
    )
    .eq('santri_id', santriId)

  if (!isAdmin) {
    query = query.eq('ustadz_id', user.id)
  }

  const { data: assignments } = await query

  const kategoriMap = new Map<
    number,
    {
      id: number
      nama: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customFields: any[]
      ustadzNames: string[]
    }
  >()
  for (const a of assignments ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = a.kategori as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = a.profiles as any
    if (!k) continue
    if (!kategoriMap.has(k.id)) {
      kategoriMap.set(k.id, {
        id: k.id,
        nama: k.nama,
        customFields: Array.isArray(k.custom_fields) ? k.custom_fields : [],
        ustadzNames: [],
      })
    }
    if (u?.nama) {
      kategoriMap.get(k.id)!.ustadzNames.push(u.nama)
    }
  }

  // FALLBACK: kalau admin & santri belum ada assignment sama sekali,
  // tampilin semua kategori institusi sebagai tab biar admin bisa input setoran.
  if (isAdmin && kategoriMap.size === 0) {
    const { data: allKategori } = await supabase
      .from('kategori')
      .select('id, nama, custom_fields')
      .eq('institusi_id', institusiId)
      .order('nama')

    for (const k of allKategori ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kAny = k as any
      kategoriMap.set(kAny.id, {
        id: kAny.id,
        nama: kAny.nama,
        customFields: Array.isArray(kAny.custom_fields)
          ? kAny.custom_fields
          : [],
        ustadzNames: [],
      })
    }
  }

  if (kategoriMap.size === 0 && !isAdmin) {
    notFound()
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
      kualitas, catatan, custom_values,
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