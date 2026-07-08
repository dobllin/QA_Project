import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../login/actions'

const peranLabel: Record<string, string> = {
  ustadz: 'Ustadz',
  ustadzah: 'Ustadzah',
  admin: 'Admin institusi',
}

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

export default async function InstitusiPickerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')
  if (profile.is_super_admin) redirect('/super')

  const { data: assignments } = await supabase
    .from('user_institusi')
    .select('institusi_id, peran, institusi(id, nama, jenis)')
    .eq('user_id', user.id)

  if (!assignments || assignments.length === 0) redirect('/')

  // Group by institusi_id
  const grouped = new Map<
    number,
    {
      institusi: { id: number; nama: string; jenis: string }
      perans: string[]
    }
  >()

  for (const a of assignments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inst = a.institusi as any
    if (!inst) continue
    if (!grouped.has(a.institusi_id)) {
      grouped.set(a.institusi_id, { institusi: inst, perans: [] })
    }
    grouped.get(a.institusi_id)!.perans.push(a.peran)
  }

  const uniqueInstitusi = Array.from(grouped.values())

  // Kalau cuma 1 institusi → langsung masuk
  if (uniqueInstitusi.length === 1) {
    redirect(`/institusi/${uniqueInstitusi[0].institusi.id}`)
  }

  // 2+ institusi → tampil picker
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-cream-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600">
              {profile.nama}
            </div>
            <div className="text-xs text-ink-500 mt-0.5">
              Kamu handle {uniqueInstitusi.length} institusi
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-ink-500 hover:text-ink-900 border border-line rounded-lg px-3 py-1.5 transition"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-6 pt-16">
        <div className="w-full max-w-2xl">
          <div className="mb-10 text-center">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
              Pilih institusi
            </div>
            <h1 className="font-display text-5xl text-forest-800 leading-none">
              Mau masuk ke mana?
            </h1>
            <p className="mt-4 text-sm text-ink-500 leading-relaxed">
              Pilih institusi yang mau kamu buka hari ini.
            </p>
          </div>

          <div className="divider-double mb-8" />

          <div className="grid gap-3">
            {uniqueInstitusi.map(({ institusi, perans }) => (
              <Link
                key={institusi.id}
                href={`/institusi/${institusi.id}`}
                className="group bg-cream-50 border border-line rounded-xl p-6 hover:border-forest-700 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
                      {jenisLabel[institusi.jenis] ?? institusi.jenis}
                    </div>
                    <h2 className="font-display text-2xl text-forest-800 group-hover:text-forest-600 transition">
                      {institusi.nama}
                    </h2>
                    <div className="mt-2 text-xs text-ink-500">
                      Kamu sebagai{' '}
                      <span className="text-forest-800 font-medium">
                        {perans
                          .map((p) => peranLabel[p] ?? p)
                          .join(' + ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-ink-400 group-hover:text-forest-700 transition text-2xl">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}