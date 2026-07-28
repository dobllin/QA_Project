'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function kirimResetPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) {
    redirect('/login/lupa?error=' + encodeURIComponent('Email wajib diisi.'))
  }

  const supabase = await createClient()

  // URL tujuan setelah user klik link di email. Diambil dari header origin
  // supaya otomatis benar baik di localhost maupun di domain Vercel.
  const { headers } = await import('next/headers')
  const h = await headers()
  const origin =
    h.get('origin') ??
    (h.get('host') ? `https://${h.get('host')}` : 'http://localhost:3000')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login/atur-ulang`,
  })

  if (error) {
    redirect('/login/lupa?error=' + encodeURIComponent(error.message))
  }

  // Selalu tampilkan sukses walau email tidak terdaftar (biar tidak bocor
  // email mana yang ada di sistem).
  redirect('/login/lupa?sent=1')
}

export async function aturUlangPassword(formData: FormData) {
  const pw = String(formData.get('password') ?? '').trim()
  if (pw.length < 6) {
    redirect(
      '/login/atur-ulang?error=' +
        encodeURIComponent('Password minimal 6 karakter.')
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: pw })
  if (error) {
    redirect('/login/atur-ulang?error=' + encodeURIComponent(error.message))
  }

  redirect('/login?reset=ok')
}