// ============================================================
// FILE: app/institusi/[id]/target/page.tsx
// ============================================================

import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import TargetClient from './target-client'

type ProgresRow = {
  ayat_mulai: number | null
  ayat_selesai: number | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  iqro_halaman: number | null
}

export default async function TargetPage({
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

  // Cek user punya akses ke institusi ini
  if (!isAdmin) {
    const { data: userInst } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .in('peran', ['ustadz', 'ustadzah'])
    if (!userInst || userInst.length === 0) {
      redirect(`/institusi/${institusiId}`)
    }
  }

  // Fetch: institusi, ustadz list, kategori list, targets
  const [
    { data: institusi },
    { data: kategoriList },
    { data: userInsts },
    { data: targets },
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
    (isAdmin
      ? supabase
          .from('ustadz_target')
          .select('*')
          .eq('institusi_id', institusiId)
      : supabase
          .from('ustadz_target')
          .select('*')
          .eq('institusi_id', institusiId)
          .eq('ustadz_id', user.id)
    ).order('created_at', { ascending: false }),
  ])

  if (!institusi) notFound()

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

  // Hitung progress otomatis per target
  const ustadzNameMap = new Map(ustadzList.map((u) => [u.id, u.nama]))
  const kategoriNameMap = new Map((kategoriList ?? []).map((k) => [k.id, k.nama]))

  const enrichedTargets = await Promise.all(
    (targets ?? []).map(async (t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const target = t as any

      const { data: progresRows } = await supabase
        .from('progress')
        .select(
          'ayat_mulai, ayat_selesai, halaman_mulai, halaman_selesai, iqro_halaman'
        )
        .eq('ustadz_id', target.ustadz_id)
        .eq('kategori_id', target.kategori_id)
        .gte('tanggal', target.target_mulai)
        .lte('tanggal', target.target_selesai)

      let progressValue = 0
      const rows = (progresRows ?? []) as ProgresRow[]

      if (target.unit_type === 'setoran') {
        progressValue = rows.length
      } else if (target.unit_type === 'ayat') {
        for (const r of rows) {
          if (r.ayat_mulai != null && r.ayat_selesai != null) {
            const diff = r.ayat_selesai - r.ayat_mulai + 1
            if (diff > 0) progressValue += diff
          }
        }
      } else if (target.unit_type === 'halaman') {
        for (const r of rows) {
          if (r.halaman_mulai != null && r.halaman_selesai != null) {
            const diff = r.halaman_selesai - r.halaman_mulai + 1
            if (diff > 0) progressValue += diff
          } else if (r.iqro_halaman != null) {
            progressValue += 1
          }
        }
      }

      return {
        id: target.id as string,
        ustadzId: target.ustadz_id as string,
        ustadzNama: ustadzNameMap.get(target.ustadz_id) ?? '—',
        kategoriId: target.kategori_id as number,
        kategoriNama: kategoriNameMap.get(target.kategori_id) ?? '—',
        judul: target.judul as string,
        deskripsi: (target.deskripsi ?? null) as string | null,
        unitType: target.unit_type as 'setoran' | 'ayat' | 'halaman',
        targetValue: target.target_value as number,
        targetMulai: target.target_mulai as string,
        targetSelesai: target.target_selesai as string,
        status: target.status as 'aktif' | 'selesai' | 'batal',
        progressValue,
      }
    })
  )

  return (
    <TargetClient
      institusi={institusi}
      institusiId={institusiId}
      isAdmin={isAdmin}
      currentUserId={user.id}
      ustadzList={ustadzList}
      kategoriList={kategoriList ?? []}
      targets={enrichedTargets}
    />
  )
}