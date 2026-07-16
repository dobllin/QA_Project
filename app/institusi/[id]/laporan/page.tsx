// ============================================================
// FILE: app/institusi/[id]/laporan/page.tsx
// ============================================================

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LaporanClient from './laporan-client'

type CustomField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

type ProgresRow = {
  id: string
  tanggal: string
  kategori_id: number
  jenis_setoran: string | null
  lancar: boolean | null
  surah_mulai: string | null
  ayat_mulai: number | null
  surah_selesai: string | null
  ayat_selesai: number | null
  kitab_nama: string | null
  bab: string | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  absen: boolean | null
  kendala: string | null
  iqro_jilid: number | null
  iqro_halaman: number | null
  kualitas: string | null
  catatan: string | null
  custom_values: Record<string, string | number | null> | null
}

// Convert "YYYY-Www" ke rentang tanggal Senin-Minggu
function weekToDateRange(weekStr: string): { start: string; end: string } {
  const match = weekStr.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) {
    // fallback: minggu ini
    const now = new Date()
    return isoWeekRange(now)
  }
  const year = parseInt(match[1])
  const week = parseInt(match[2])

  // ISO 8601: minggu 1 adalah minggu yg mengandung 4 Januari
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Weekday = jan4.getUTCDay() || 7 // Minggu = 7
  const week1Monday = new Date(jan4.getTime() - (jan4Weekday - 1) * 86400000)
  const monday = new Date(week1Monday.getTime() + (week - 1) * 7 * 86400000)
  const sunday = new Date(monday.getTime() + 6 * 86400000)

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

function isoWeekRange(d: Date): { start: string; end: string } {
  const day = d.getUTCDay() || 7
  const monday = new Date(d.getTime() - (day - 1) * 86400000)
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

function getCurrentWeekStr(): string {
  const now = new Date()
  const tempDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )
  const dayNum = tempDate.getUTCDay() || 7
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(
    ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return `${tempDate.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export default async function LaporanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ santri?: string; minggu?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const santriId = sp.santri
  const currentMinggu = sp.minggu ?? getCurrentWeekStr()
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

  let ustadzAssignments: { santri_id: string; kategori_id: number }[] = []
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

    const { data: myAssignments } = await supabase
      .from('ustadz_santri')
      .select('santri_id, kategori_id')
      .eq('ustadz_id', user.id)

    ustadzAssignments = myAssignments ?? []
  }

  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .eq('id', institusiId)
    .single()

  let santriListQuery = supabase
    .from('santri')
    .select('id, nama, kelas, halaqoh, tahun_masuk, poin')
    .eq('institusi_id', institusiId)
    .order('nama')

  if (!isAdmin) {
    const mySantriIds = Array.from(
      new Set(ustadzAssignments.map((a) => a.santri_id))
    )
    if (mySantriIds.length === 0) {
      santriListQuery = santriListQuery.eq(
        'id',
        '00000000-0000-0000-0000-000000000000'
      )
    } else {
      santriListQuery = santriListQuery.in('id', mySantriIds)
    }
  }

  const { data: santriList } = await santriListQuery

  const { start: startDate, end: endDate } = weekToDateRange(currentMinggu)

  let santriData = null
  if (santriId) {
    const canAccess =
      isAdmin || ustadzAssignments.some((a) => a.santri_id === santriId)

    if (canAccess) {
      const { data: santri } = await supabase
        .from('santri')
        .select('id, nama, kelas, halaqoh, tahun_masuk, poin')
        .eq('id', santriId)
        .eq('institusi_id', institusiId)
        .single()

      if (santri) {
        const allowedKategoriIds = isAdmin
          ? null
          : new Set(
              ustadzAssignments
                .filter((a) => a.santri_id === santriId)
                .map((a) => a.kategori_id)
            )

        let kategoriQuery = supabase
          .from('kategori')
          .select('id, nama, custom_fields')
          .eq('institusi_id', institusiId)
          .order('nama')

        if (allowedKategoriIds) {
          const ids = Array.from(allowedKategoriIds)
          if (ids.length === 0) {
            kategoriQuery = kategoriQuery.eq('id', -1)
          } else {
            kategoriQuery = kategoriQuery.in('id', ids)
          }
        }

        let progressQuery = supabase
          .from('progress')
          .select(
            'id, tanggal, kategori_id, jenis_setoran, lancar, surah_mulai, ayat_mulai, surah_selesai, ayat_selesai, kitab_nama, bab, halaman_mulai, halaman_selesai, absen, kendala, iqro_jilid, iqro_halaman, kualitas, catatan, custom_values'
          )
          .eq('santri_id', santriId)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)
          .order('tanggal', { ascending: true })

        if (allowedKategoriIds) {
          const ids = Array.from(allowedKategoriIds)
          if (ids.length === 0) {
            progressQuery = progressQuery.eq('kategori_id', -1)
          } else {
            progressQuery = progressQuery.in('kategori_id', ids)
          }
        }

        const [
          { data: kategoriList },
          { data: progressList },
          { data: poinList },
        ] = await Promise.all([
          kategoriQuery,
          progressQuery,
          supabase
            .from('poin_log')
            .select('id, jenis, nilai_perubahan, keterangan, tanggal')
            .eq('santri_id', santriId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true }),
        ])

        const kategoriMap = new Map<
          number,
          {
            id: number
            nama: string
            customFields: CustomField[]
            progres: ProgresRow[]
          }
        >()
        for (const k of kategoriList ?? []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kAny = k as any
          kategoriMap.set(kAny.id, {
            id: kAny.id,
            nama: kAny.nama,
            customFields: Array.isArray(kAny.custom_fields)
              ? kAny.custom_fields
              : [],
            progres: [],
          })
        }
        for (const p of (progressList ?? []) as ProgresRow[]) {
          const entry = kategoriMap.get(p.kategori_id)
          if (entry) entry.progres.push(p)
        }

        const kategoriWithProgres = Array.from(kategoriMap.values()).filter(
          (k) => k.progres.length > 0
        )

        const totalWithAbsen = (progressList ?? []).filter(
          (p) => p.absen !== null
        ).length
        const totalHadir = (progressList ?? []).filter(
          (p) => p.absen === false
        ).length
        const totalTidakHadir = (progressList ?? []).filter(
          (p) => p.absen === true
        ).length

        santriData = {
          santri,
          kategoriList: kategoriWithProgres,
          totalSetoran: (progressList ?? []).length,
          totalWithAbsen,
          totalHadir,
          totalTidakHadir,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          poinLog: (poinList ?? []) as any[],
          poinAwal:
            (santri.poin ?? 100) -
            (poinList ?? []).reduce((sum, l) => sum + l.nilai_perubahan, 0),
          poinAkhir: santri.poin ?? 100,
        }
      }
    }
  }

  return (
    <LaporanClient
      institusi={institusi ?? { id: institusiId, nama: '', jenis: '' }}
      institusiId={institusiId}
      santriList={santriList ?? []}
      currentSantriId={santriId ?? null}
      currentMinggu={currentMinggu}
      weekStart={startDate}
      weekEnd={endDate}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      santriData={santriData as any}
    />
  )
}