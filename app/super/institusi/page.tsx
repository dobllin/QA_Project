import { createClient } from '@/utils/supabase/server'

export default async function InstitusiPage() {
  const supabase = await createClient()

  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .order('id')

  // Ambil counts per institusi
  const stats = await Promise.all(
    (institusi ?? []).map(async (inst) => {
      const [{ count: santriCount }, { count: kategoriCount }, { count: userCount }] =
        await Promise.all([
          supabase
            .from('santri')
            .select('*', { count: 'exact', head: true })
            .eq('institusi_id', inst.id),
          supabase
            .from('kategori')
            .select('*', { count: 'exact', head: true })
            .eq('institusi_id', inst.id),
          supabase
            .from('user_institusi')
            .select('*', { count: 'exact', head: true })
            .eq('institusi_id', inst.id),
        ])
      return {
        ...inst,
        santri: santriCount ?? 0,
        kategori: kategoriCount ?? 0,
        pengajar: userCount ?? 0,
      }
    })
  )

  const jenisLabel: Record<string, string> = {
    RA: 'Raudhatul Athfal',
    TPQ: 'Taman Pendidikan Quran',
    PONPES: 'Pondok Pesantren',
  }

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Kelola
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Institusi
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Tiga lembaga pendidikan yang dikelola sistem — masing-masing dengan
          santri, kategori, dan pengajarnya sendiri.
        </p>
      </div>

      <div className="divider-double mb-8" />

      <div className="grid gap-4">
        {stats.map((inst) => (
          <div
            key={inst.id}
            className="bg-cream-50 border border-line rounded-xl p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
                  {jenisLabel[inst.jenis] ?? inst.jenis}
                </div>
                <h2 className="font-display text-2xl text-forest-800">
                  {inst.nama}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-line/60">
              <div>
                <div className="text-xs text-ink-500 mb-1">Santri</div>
                <div className="font-display text-2xl text-forest-800">
                  {inst.santri}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-500 mb-1">Kategori</div>
                <div className="font-display text-2xl text-forest-800">
                  {inst.kategori}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-500 mb-1">Pengajar</div>
                <div className="font-display text-2xl text-forest-800">
                  {inst.pengajar}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}