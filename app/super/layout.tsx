import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../login/actions'
import NavLink from './nav-link'
import AppShell from '@/app/components/app-shell'

export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (!profile?.is_super_admin) redirect('/')

  return (
    <AppShell
      showLogo={false}
      brand={
        <Link href="/super" className="block min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-[0.16em] text-copper-600">
            Super Admin
          </div>
          <div className="font-display text-base text-forest-800 leading-tight truncate">
            {profile.nama}
          </div>
        </Link>
      }
      sidebar={
        <>
          <div className="p-6 border-b border-line">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
              Super Admin
            </div>
            <Link href="/super" className="block">
              <div className="font-display text-lg text-forest-800 leading-tight">
                {profile.nama}
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            <NavLink href="/super">Ringkasan</NavLink>
            <NavLink href="/super/santri">Semua santri</NavLink>
            <NavLink href="/super/pengguna">Pengguna</NavLink>
            <NavLink href="/super/institusi">Institusi</NavLink>
          </nav>

          <div className="p-4 border-t border-line">
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-ink-500 hover:text-ink-900 transition"
              >
                Keluar dari sistem
              </button>
            </form>
          </div>
        </>
      }
    >
      {children}
    </AppShell>
  )
}