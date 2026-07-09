import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../login/actions'
import NavLink from './nav-link'

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
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-line bg-cream-50 flex flex-col shrink-0">
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
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8 lg:p-12">{children}</div>
      </main>
    </div>
  )
}