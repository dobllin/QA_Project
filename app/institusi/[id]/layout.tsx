import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../../login/actions'

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

export default async function InstitusiLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const institusiId = Number(id)

  if (!institusiId || Number.isNaN(institusiId)) redirect('/institusi')

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

  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .eq('id', institusiId)
    .single()

  if (!institusi) redirect('/institusi')

  let userPerans: string[] = []
  if (profile.is_super_admin) {
    userPerans = ['admin']
  } else {
    const { data: assignments } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)

    if (!assignments || assignments.length === 0) {
      redirect('/institusi')
    }
    userPerans = assignments.map((a) => a.peran)
  }

  const isAdmin = userPerans.includes('admin')
  const isPondok = institusi.jenis === 'PONPES'

  const { count: totalAssignments } = await supabase
    .from('user_institusi')
    .select('institusi_id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const hasMultipleInstitusi = (totalAssignments ?? 0) > 1 || profile.is_super_admin

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-line bg-cream-50 flex flex-col shrink-0">
        <div className="p-6 border-b border-line">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
            {jenisLabel[institusi.jenis] ?? institusi.jenis}
          </div>
          <Link href={`/institusi/${institusi.id}`}>
            <div className="font-display text-lg text-forest-800 leading-tight">
              {institusi.nama}
            </div>
          </Link>
          <div className="mt-3 pt-3 border-t border-line/60">
            <div className="text-xs text-ink-500 mb-0.5">{profile.nama}</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-400">
              {userPerans.map((p) => peranLabel[p] ?? p).join(' · ')}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <NavItem href={`/institusi/${institusi.id}`}>Ringkasan</NavItem>
          <NavItem href={`/institusi/${institusi.id}/santri`}>
            {isAdmin ? 'Semua santri' : 'Santri saya'}
          </NavItem>
          <NavItem href={`/institusi/${institusi.id}/kategori`}>
            {isAdmin ? 'Kategori' : 'Kategori saya'}
          </NavItem>
         {isAdmin && (
  <>
    <NavItem href={`/institusi/${institusi.id}/kehadiran`}>Kehadiran</NavItem>
    <NavItem href={`/institusi/${institusi.id}/laporan`}>Laporan</NavItem>
  </>
)}
          {isPondok && (
            <NavItem href={`/institusi/${institusi.id}/recap`}>Recap poin</NavItem>
          )}
        </nav>

        <div className="p-4 border-t border-line space-y-2">
          {hasMultipleInstitusi && (
            <Link
              href={profile.is_super_admin ? '/super' : '/institusi'}
              className="block text-xs text-ink-500 hover:text-ink-900 transition"
            >
              ← {profile.is_super_admin ? 'Dashboard super admin' : 'Pilih institusi lain'}
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-ink-500 hover:text-ink-900 transition"
            >
              Keluar dari sistem
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8 lg:p-12">{children}</div>
      </main>
    </div>
  )
}

function NavItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-ink-700 hover:bg-cream-200/60 transition"
    >
      {children}
    </Link>
  )
}