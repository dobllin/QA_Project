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

function monthToDateRange(monthStr: string): { start: string; end: string } {
  const match = monthStr.match(/^(\d{4})-(\d{1,2})$/)
  if (!match) {
    const now = new Date()
    return currentMonthRange(now)
  }
  const year = parseInt(match[1])
  const month = parseInt(match[2])
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function currentMonthRange(d: Date): { start: string; end: string } {
  const y = d.getFullYear()
  const m = d.getMonth()
  const start = new Date(Date.UTC(y, m, 1))
  const end = new Date(Date.UTC(y, m + 1, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function getCurrentMonthStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default async function LaporanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ santri?: string; bulan?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const santriId = sp.santri
  const currentBulan = sp.bulan ?? getCurrentMonthStr()
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

  const { start: startDate, end: endDate } = monthToDateRange(currentBulan)

  let santriData = null
  if (santriId) {
    const canAccess =
      isAdmin || ustadzAssignments.some((a) => a.santri_id === santriId)

    if (canAccess) {
      const { data: santri } = await supabase
        .from('santri')
        .select('id, nama, kelas, halaqoh, tahun_masuk, poin, wali_kelas_id')
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
          { data: kehadiranList },
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
          supabase
            .from('kehadiran')
            .select('id, tanggal, status, keterangan')
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

        const kehadiranRows = (kehadiranList ?? []) as {
          id: string
          tanggal: string
          status: string
          keterangan: string | null
        }[]

        const kehadiranCount = {
          hadir: kehadiranRows.filter((k) => k.status === 'hadir').length,
          izin: kehadiranRows.filter((k) => k.status === 'izin').length,
          sakit: kehadiranRows.filter((k) => k.status === 'sakit').length,
          alpha: kehadiranRows.filter((k) => k.status === 'alpha').length,
        }
        const totalTercatat =
          kehadiranCount.hadir +
          kehadiranCount.izin +
          kehadiranCount.sakit +
          kehadiranCount.alpha

        // Fetch wali kelas info (nama + ttd_url) kalo santri punya wali_kelas_id
        let waliKelas: { id: string; nama: string; ttd_url: string | null } | null = null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const walikelasId = (santri as any).wali_kelas_id
        if (walikelasId) {
          const { data: wk } = await supabase
            .from('profiles')
            .select('id, nama, ttd_url')
            .eq('id', walikelasId)
            .single()
          if (wk) {
            waliKelas = {
              id: wk.id,
              nama: wk.nama,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ttd_url: (wk as any).ttd_url ?? null,
            }
          }
        }

        santriData = {
          santri,
          waliKelas,
          kategoriList: kategoriWithProgres,
          totalSetoran: (progressList ?? []).length,
          kehadiranList: kehadiranRows,
          kehadiranCount,
          totalKehadiranTercatat: totalTercatat,
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
      currentBulan={currentBulan}
      periodStart={startDate}
      periodEnd={endDate}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      santriData={santriData as any}
    />
  )
}