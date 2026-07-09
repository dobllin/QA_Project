import { createClient } from '@/utils/supabase/server'
import SuperSantriClient from './super-santri-client'

export default async function SuperSantriPage() {
  const supabase = await createClient()

  const monthStart = new Date(new Date().setDate(1))
    .toISOString()
    .split('T')[0]

  const [
    { data: institusi },
    { data: santri },
    { data: kategori },
    { data: userInsts },
    { data: assignments },
    { data: progresBulanIni },
  ] = await Promise.all([
    supabase.from('institusi').select('id, nama, jenis').order('id'),
    supabase
      .from('santri')
      .select(
        'id, nama, kelas, halaqoh, tahun_masuk, poin, institusi_id, institusi(nama, jenis)'
      )
      .order('nama'),
    supabase.from('kategori').select('id, institusi_id'),
    supabase
      .from('user_institusi')
      .select('user_id, institusi_id, peran')
      .in('peran', ['ustadz', 'ustadzah']),
    supabase.from('ustadz_santri').select('santri_id, kategori_id, ustadz_id'),
    supabase
      .from('progress')
      .select('institusi_id')
      .gte('tanggal', monthStart),
  ])

  // Enrich santri dengan kategori & ustadz count
  const kategoriPerSantri = new Map<string, Set<number>>()
  const ustadzPerSantri = new Map<string, Set<string>>()

  for (const a of assignments ?? []) {
    if (!kategoriPerSantri.has(a.santri_id)) {
      kategoriPerSantri.set(a.santri_id, new Set())
    }
    kategoriPerSantri.get(a.santri_id)!.add(a.kategori_id)

    if (!ustadzPerSantri.has(a.santri_id)) {
      ustadzPerSantri.set(a.santri_id, new Set())
    }
    ustadzPerSantri.get(a.santri_id)!.add(a.ustadz_id)
  }

  const enrichedSantri = (santri ?? []).map((s) => ({
    ...s,
    kategoriCount: kategoriPerSantri.get(s.id)?.size ?? 0,
    ustadzCount: ustadzPerSantri.get(s.id)?.size ?? 0,
  }))

  // Compute stats per institusi
  const institusiWithStats =
    (institusi ?? []).map((i) => {
      const santriInInst = enrichedSantri.filter(
        (s) => s.institusi_id === i.id
      )
      const kategoriInInst =
        (kategori ?? []).filter((k) => k.institusi_id === i.id).length
      const uniqueUstadz = new Set(
        (userInsts ?? [])
          .filter((u) => u.institusi_id === i.id)
          .map((u) => u.user_id)
      ).size
      const progresInInst =
        (progresBulanIni ?? []).filter((p) => p.institusi_id === i.id).length

      const avgPoin =
        santriInInst.length > 0
          ? Math.round(
              santriInInst.reduce((sum, s) => sum + (s.poin ?? 100), 0) /
                santriInInst.length
            )
          : 100

      return {
        ...i,
        stats: {
          santriCount: santriInInst.length,
          kategoriCount: kategoriInInst,
          pengajarCount: uniqueUstadz,
          progresBulanIni: progresInInst,
          avgPoin,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        santri: santriInInst as any,
      }
    })

  return <SuperSantriClient institusiList={institusiWithStats} />
}