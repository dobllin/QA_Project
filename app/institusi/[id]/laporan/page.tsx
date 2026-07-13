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
  const currentBulan = sp.bulan ?? new Date().toISOString().slice(0, 7)
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

  // Fetch institusi + list santri
  const [{ data: institusi }, { data: santriList }] = await Promise.all([
    supabase
      .from('institusi')
      .select('id, nama, jenis')
      .eq('id', institusiId)
      .single(),
    supabase
      .from('santri')
      .select('id, nama, kelas, halaqoh, tahun_masuk, poin')
      .eq('institusi_id', institusiId)
      .order('nama'),
  ])

  // Parse bulan → date range
  const [year, month] = currentBulan.split('-').map(Number)
  const startDate = new Date(Date.UTC(year, month - 1, 1))
    .toISOString()
    .slice(0, 10)
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))
    .toISOString()
    .slice(0, 10)

  // Kalau belum pilih santri, skip fetch data
  let santriData = null
  if (santriId) {
    const { data: santri } = await supabase
      .from('santri')
      .select('id, nama, kelas, halaqoh, tahun_masuk, poin')
      .eq('id', santriId)
      .eq('institusi_id', institusiId)
      .single()

    if (santri) {
      const [{ data: kategoriList }, { data: progressList }, { data: poinList }] =
        await Promise.all([
          supabase
            .from('kategori')
            .select('id, nama, custom_fields')
            .eq('institusi_id', institusiId)
            .order('nama'),
          supabase
            .from('progress')
            .select(
              'id, tanggal, kategori_id, jenis_setoran, lancar, surah_mulai, ayat_mulai, surah_selesai, ayat_selesai, kitab_nama, bab, halaman_mulai, halaman_selesai, absen, kendala, iqro_jilid, iqro_halaman, kualitas, catatan, custom_values'
            )
            .eq('santri_id', santriId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true }),
          supabase
            .from('poin_log')
            .select('id, jenis, nilai_perubahan, keterangan, tanggal')
            .eq('santri_id', santriId)
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true }),
        ])

      // Group progres per kategori
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

      // Filter cuma kategori yg ada progress-nya
      const kategoriWithProgres = Array.from(kategoriMap.values()).filter(
        (k) => k.progres.length > 0
      )

      // Kehadiran (dari field absen)
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

  return (
    <LaporanClient
      institusi={institusi ?? { id: institusiId, nama: '', jenis: '' }}
      institusiId={institusiId}
      santriList={santriList ?? []}
      currentSantriId={santriId ?? null}
      currentBulan={currentBulan}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      santriData={santriData as any}
    />
  )
}