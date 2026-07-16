import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import KategoriClient from './kategori-client'

export default async function KategoriPage({
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

  if (!isAdmin) {
    return (
      <UstadzKategoriView institusiId={institusiId} userId={user.id} />
    )
  }

  // Fetch: institusi, kategori, semua ustadz di institusi, semua santri di institusi, semua assignment
  const [
    { data: institusi },
    { data: kategori },
    { data: userInsts },
    { data: santriList },
    { data: assignments },
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
    supabase
      .from('santri')
      .select('id, nama, kelas, institusi_id')
      .eq('institusi_id', institusiId)
      .order('nama'),
    supabase
      .from('ustadz_santri')
      .select(
        'id, kategori_id, ustadz_id, santri_id, santri:santri_id(id, nama, kelas, institusi_id), ustadz:ustadz_id(id, nama)'
      ),
  ])

  if (!institusi) notFound()

  // Extract ustadz list
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

  // Grup assignment: kategori_id -> ustadz_id -> [assignment{id, santri}]
  type Assignment = {
    id: string
    kategori_id: number
    ustadz_id: string
    santri_id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    santri: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ustadz: any
  }

  const grouped = new Map<
    number,
    Map<
      string,
      {
        ustadzNama: string
        items: {
          assignmentId: string
          santriId: string
          santriNama: string
          santriKelas: string | null
        }[]
      }
    >
  >()

  for (const a of (assignments ?? []) as Assignment[]) {
    if (!a.santri || !a.ustadz) continue
    if (a.santri.institusi_id !== institusiId) continue

    if (!grouped.has(a.kategori_id)) grouped.set(a.kategori_id, new Map())
    const perUstadz = grouped.get(a.kategori_id)!

    if (!perUstadz.has(a.ustadz_id)) {
      perUstadz.set(a.ustadz_id, {
        ustadzNama: a.ustadz.nama ?? '—',
        items: [],
      })
    }
    perUstadz.get(a.ustadz_id)!.items.push({
      assignmentId: a.id,
      santriId: a.santri.id,
      santriNama: a.santri.nama,
      santriKelas: a.santri.kelas ?? null,
    })
  }

  const kategoriData = (kategori ?? []).map((k) => {
    const perUstadz = grouped.get(k.id)
    const assignedUstadzIds = perUstadz ? Array.from(perUstadz.keys()) : []
    const ustadzGroups = assignedUstadzIds
      .map((uid) => ({
        ustadzId: uid,
        ustadzNama: perUstadz!.get(uid)!.ustadzNama,
        items: perUstadz!.get(uid)!.items.sort((a, b) =>
          a.santriNama.localeCompare(b.santriNama)
        ),
      }))
      .sort((a, b) => a.ustadzNama.localeCompare(b.ustadzNama))

    const totalSantri = ustadzGroups.reduce((sum, u) => sum + u.items.length, 0)

    return {
      id: k.id,
      nama: k.nama,
      ustadzGroups,
      totalSantri,
      totalUstadz: ustadzGroups.length,
    }
  })

  return (
    <KategoriClient
      institusi={institusi}
      institusiId={institusiId}
      kategori={kategoriData}
      ustadzList={ustadzList}
      santriList={(santriList ?? []).map((s) => ({
        id: s.id,
        nama: s.nama,
        kelas: s.kelas ?? null,
      }))}
    />
  )
}
/**
 * Tab "Kategori saya" — versi ustadz/ustadzah.
 * Read-only: kategori + santri di sini datangnya dari penugasan yang dibikin
 * admin (tabel `ustadz_santri`). Ustadz gak bisa bikin/hapus kategori,
 * cuma lihat mana yang wajib disetor hari ini dan langsung buka formnya.
 */
async function UstadzKategoriView({
  institusiId,
  userId,
}: {
  institusiId: number
  userId: string
}) {
  const supabase = await createClient()
  const hariIni = new Date().toISOString().split('T')[0]

  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .eq('id', institusiId)
    .single()

  if (!institusi) notFound()

  const { data: myAssignments } = await supabase
    .from('ustadz_santri')
    .select(
      'santri_id, kategori_id, santri:santri_id(id, nama, kelas, institusi_id), kategori:kategori_id(id, nama, institusi_id)'
    )
    .eq('ustadz_id', userId)

  const rows = (myAssignments ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a) => (a.santri as any)?.institusi_id === institusiId
  )

  // Gak difilter ustadz_id: 1 setoran per santri per kategori per hari,
  // siapa pun yang input.
  const { data: todayProgres } = await supabase
    .from('progress')
    .select('santri_id, kategori_id')
    .eq('institusi_id', institusiId)
    .eq('tanggal', hariIni)

  const doneToday = new Set(
    (todayProgres ?? []).map((p) => `${p.santri_id}:${p.kategori_id}`)
  )

  type Row = {
    santriId: string
    nama: string
    kelas: string | null
    done: boolean
  }
  const grouped = new Map<number, { id: number; nama: string; santri: Row[] }>()

  for (const a of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = a.kategori as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = a.santri as any
    if (!k || !s) continue
    if (!grouped.has(a.kategori_id)) {
      grouped.set(a.kategori_id, { id: k.id, nama: k.nama, santri: [] })
    }
    grouped.get(a.kategori_id)!.santri.push({
      santriId: s.id,
      nama: s.nama,
      kelas: s.kelas ?? null,
      done: doneToday.has(`${a.santri_id}:${a.kategori_id}`),
    })
  }

  const kategoriList = Array.from(grouped.values())
    .map((k) => ({
      ...k,
      santri: k.santri.sort((a, b) => a.nama.localeCompare(b.nama)),
      doneCount: k.santri.filter((s) => s.done).length,
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama))

  const totalTugas = rows.length
  const totalSelesai = kategoriList.reduce((sum, k) => sum + k.doneCount, 0)
  const belum = totalTugas - totalSelesai

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Tugas harian
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Kategori saya
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Kategori dan santri di sini ditentukan admin institusi. Setiap santri
          wajib diisi 1× sehari di tiap kategori.
        </p>
      </div>

      <div className="divider-double mb-8" />

      {totalTugas > 0 && (
        <div
          className={`mb-8 rounded-xl border p-4 ${
            belum === 0
              ? 'border-success-500/30 bg-success-500/10'
              : 'border-copper-500/30 bg-copper-500/10'
          }`}
        >
          <div className="text-sm font-medium text-ink-900">
            {belum === 0
              ? `Beres — ${totalSelesai}/${totalTugas} setoran hari ini sudah diisi`
              : `${belum} dari ${totalTugas} setoran belum diisi hari ini`}
          </div>
        </div>
      )}

      {kategoriList.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Kamu belum ditugaskan ke kategori manapun di institusi ini. Hubungi
            admin institusi.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {kategoriList.map((k) => (
            <div
              key={k.id}
              className="bg-cream-50 border border-line rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 p-5 border-b border-line">
                <div>
                  <Link
                    href={`/institusi/${institusiId}/kategori/${k.id}`}
                    className="font-display text-xl text-forest-800 hover:text-forest-600 transition"
                  >
                    {k.nama} →
                  </Link>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {k.santri.length} santri · klik buat isi setoran sekaligus
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${
                    k.doneCount === k.santri.length
                      ? 'text-success-500 bg-success-500/10 border-success-500/30'
                      : 'text-copper-600 bg-copper-500/10 border-copper-500/30'
                  }`}
                >
                  {k.doneCount}/{k.santri.length} hari ini
                </span>
              </div>

              <div className="divide-y divide-line/60">
                {k.santri.map((s) => (
                  <Link
                    key={s.santriId}
                    href={`/institusi/${institusiId}/santri/${s.santriId}?kategori=${k.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-3 hover:bg-cream-200/40 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-forest-800 group-hover:text-forest-600 transition">
                        {s.nama}
                      </div>
                      {s.kelas && (
                        <div className="text-xs text-ink-500 mt-0.5">
                          Kelas {s.kelas}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${
                        s.done
                          ? 'text-success-500 bg-success-500/10 border-success-500/30'
                          : 'text-ink-500 bg-cream-100 border-line group-hover:border-forest-700 group-hover:text-forest-800'
                      }`}
                    >
                      {s.done ? '✓ Sudah diisi' : 'Belum · input →'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}