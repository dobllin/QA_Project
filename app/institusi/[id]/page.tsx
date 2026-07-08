import { createClient } from '@/utils/supabase/server'
import AdminOverviewClient from './admin-overview-client'

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

export default async function InstitusiOverviewPage({
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
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .eq('id', institusiId)
    .single()

  if (!institusi) return null

  let isAdmin = profile?.is_super_admin ?? false
  if (!isAdmin) {
    const { data: perans } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
    isAdmin = perans?.some((p) => p.peran === 'admin') ?? false
  }

  if (isAdmin) {
    return <AdminOverview institusiId={institusiId} institusi={institusi} />
  }

  return (
    <UstadzOverview
      institusiId={institusiId}
      institusi={institusi}
      userId={user.id}
    />
  )
}

async function AdminOverview({
  institusiId,
  institusi,
}: {
  institusiId: number
  institusi: { nama: string; jenis: string }
}) {
  const supabase = await createClient()

  const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  // Fetch stats + santri list in parallel
  const [
    { count: santriCount },
    { count: kategoriCount },
    { count: pengajarCount },
    { count: progresBulanIni },
    { data: santriList },
  ] = await Promise.all([
    supabase
      .from('santri')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId),
    supabase
      .from('kategori')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId),
    supabase
      .from('user_institusi')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId),
    supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('institusi_id', institusiId)
      .gte('tanggal', monthStart),
    supabase
      .from('santri')
      .select('id, nama, kelas, halaqoh, tahun_masuk')
      .eq('institusi_id', institusiId)
      .order('nama'),
  ])

  const santriIds = (santriList ?? []).map((s) => s.id)

  // Fetch assignments dan progres hari ini secara parallel
  const [assignmentsResult, todayProgresResult] = await Promise.all([
    santriIds.length
      ? supabase
          .from('ustadz_santri')
          .select('santri_id')
          .in('santri_id', santriIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('progress')
      .select('santri_id')
      .eq('institusi_id', institusiId)
      .eq('tanggal', today),
  ])

  const assignments = (assignmentsResult as { data: { santri_id: string }[] | null }).data ?? []
  const todayProgres = (todayProgresResult as { data: { santri_id: string }[] | null }).data ?? []

  const assignmentCounts = new Map<string, number>()
  for (const a of assignments) {
    assignmentCounts.set(
      a.santri_id,
      (assignmentCounts.get(a.santri_id) ?? 0) + 1
    )
  }

  const progresCounts = new Map<string, number>()
  for (const p of todayProgres) {
    progresCounts.set(p.santri_id, (progresCounts.get(p.santri_id) ?? 0) + 1)
  }

  const enrichedSantri = (santriList ?? []).map((s) => ({
    ...s,
    assignmentCount: assignmentCounts.get(s.id) ?? 0,
    todayProgresCount: progresCounts.get(s.id) ?? 0,
  }))

  const stats = [
    { label: 'Santri terdaftar', value: santriCount ?? 0 },
    { label: 'Kategori aktif', value: kategoriCount ?? 0 },
    { label: 'Pengajar', value: pengajarCount ?? 0 },
    { label: 'Progres bulan ini', value: progresBulanIni ?? 0 },
  ]

  return (
    <AdminOverviewClient
      institusi={institusi}
      stats={stats}
      santriList={enrichedSantri}
      institusiId={institusiId}
    />
  )
}

async function UstadzOverview({
  institusiId,
  institusi,
  userId,
}: {
  institusiId: number
  institusi: { nama: string; jenis: string }
  userId: string
}) {
  const supabase = await createClient()

  const { data: myAssignments } = await supabase
    .from('ustadz_santri')
    .select(
      `
      santri_id,
      kategori_id,
      santri(id, nama, kelas, institusi_id),
      kategori(id, nama, institusi_id)
    `
    )
    .eq('ustadz_id', userId)

  const relevantAssignments =
    myAssignments?.filter((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const santri = a.santri as any
      return santri?.institusi_id === institusiId
    }) ?? []

  const kategoriMap = new Map<
    number,
    {
      kategori: { id: number; nama: string }
      santriCount: number
      santriNames: string[]
    }
  >()

  for (const a of relevantAssignments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = a.kategori as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = a.santri as any
    if (!k) continue
    if (!kategoriMap.has(a.kategori_id)) {
      kategoriMap.set(a.kategori_id, {
        kategori: k,
        santriCount: 0,
        santriNames: [],
      })
    }
    const entry = kategoriMap.get(a.kategori_id)!
    entry.santriCount++
    if (s?.nama) entry.santriNames.push(s.nama)
  }

  const kategoriList = Array.from(kategoriMap.values())

  const { count: progresBulanIni } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('ustadz_id', userId)
    .eq('institusi_id', institusiId)
    .gte(
      'tanggal',
      new Date(new Date().setDate(1)).toISOString().split('T')[0]
    )

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          {jenisLabel[institusi.jenis] ?? institusi.jenis} · Beranda
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          {institusi.nama}
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Ini santri dan kategori yang kamu ampu di institusi ini.
        </p>
      </div>

      <div className="divider-double mb-8" />

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-cream-50 border border-line rounded-xl p-5">
          <div className="text-xs text-ink-500 mb-2">Total santri</div>
          <div className="font-display text-3xl text-forest-800">
            {relevantAssignments.length}
          </div>
        </div>
        <div className="bg-cream-50 border border-line rounded-xl p-5">
          <div className="text-xs text-ink-500 mb-2">Progres bulan ini</div>
          <div className="font-display text-3xl text-forest-800">
            {progresBulanIni ?? 0}
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl text-forest-800 mb-4">
          Kategori yang saya ampu
        </h2>
        {kategoriList.length === 0 ? (
          <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
            <p className="text-sm text-ink-500">
              Belum ada santri yang ditugaskan ke kamu di institusi ini. Hubungi
              admin institusi.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {kategoriList.map((k) => (
              <div
                key={k.kategori.id}
                className="bg-cream-50 border border-line rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display text-xl text-forest-800">
                      {k.kategori.nama}
                    </h3>
                    <div className="text-xs text-ink-500 mt-1">
                      {k.santriCount} santri
                    </div>
                  </div>
                </div>
                {k.santriNames.length > 0 && (
                  <div className="pt-3 border-t border-line/60">
                    <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-2">
                      Santri
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {k.santriNames.map((nama, i) => (
                        <span
                          key={i}
                          className="text-xs bg-cream-100 border border-line rounded-md px-2 py-1 text-ink-700"
                        >
                          {nama}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}