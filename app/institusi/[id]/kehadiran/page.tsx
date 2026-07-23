// ============================================================
// FILE: app/institusi/[id]/kehadiran/page.tsx
// ============================================================

import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import KehadiranClient from './kehadiran-client'

export default async function KehadiranPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tanggal?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const institusiId = Number(id)

  const tanggal = sp.tanggal ?? new Date().toISOString().slice(0, 10)

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

  const [
    { data: institusi },
    { data: santriList },
    { data: kehadiranList },
  ] = await Promise.all([
    supabase
      .from('institusi')
      .select('id, nama, jenis')
      .eq('id', institusiId)
      .single(),
    supabase
      .from('santri')
      .select('id, nama, kelas, halaqoh')
      .eq('institusi_id', institusiId)
      .order('nama'),
    supabase
      .from('kehadiran')
      .select('id, santri_id, status, keterangan')
      .eq('institusi_id', institusiId)
      .eq('tanggal', tanggal),
  ])

  if (!institusi) notFound()

  // Map kehadiran per santri
  const kehadiranMap = new Map<
    string,
    { status: string; keterangan: string | null }
  >()
  for (const k of kehadiranList ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kAny = k as any
    kehadiranMap.set(kAny.santri_id, {
      status: kAny.status,
      keterangan: kAny.keterangan,
    })
  }

  const santriWithStatus = (santriList ?? []).map((s) => ({
    id: s.id,
    nama: s.nama,
    kelas: s.kelas ?? null,
    halaqoh: s.halaqoh ?? null,
    status: kehadiranMap.get(s.id)?.status ?? null,
    keterangan: kehadiranMap.get(s.id)?.keterangan ?? null,
  }))

  return (
    <KehadiranClient
      institusi={institusi}
      institusiId={institusiId}
      currentTanggal={tanggal}
      santriList={santriWithStatus}
    />
  )
}