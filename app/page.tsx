import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from './login/actions'

export default async function HomePage() {
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

  if (!profile) {
    return (
      <StatusPage
        title="Akun belum lengkap"
        message="Akun kamu belum terdaftar di sistem. Hubungi super admin untuk diaktifkan."
      />
    )
  }

  // Super admin → dashboard master
  if (profile.is_super_admin) {
    redirect('/super')
  }

  // Ambil semua assignment user
  const { data: userInst } = await supabase
    .from('user_institusi')
    .select('institusi_id')
    .eq('user_id', user.id)

  if (!userInst || userInst.length === 0) {
    return (
      <StatusPage
        title="Belum ada tugas mengajar"
        message="Kamu belum ditugaskan ke institusi manapun. Hubungi admin untuk mengaktifkan akses."
      />
    )
  }

  // Non-super admin dengan assignment → institusi picker
  redirect('/institusi')
}

function StatusPage({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-xs font-medium uppercase tracking-widest text-ink-500 mb-3 text-center">
          Sistem Pesantren
        </div>
        <div className="bg-cream-50 rounded-2xl border border-line p-8 text-center">
          <h1 className="font-display text-2xl text-forest-800 mb-3 leading-tight">
            {title}
          </h1>
          <p className="text-sm text-ink-500 mb-6 leading-relaxed">{message}</p>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-ink-500 hover:text-ink-900 border border-line rounded-lg px-4 py-2 transition"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}