import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Kalau env belum terpasang (lupa diisi di Vercel), jangan bikin
  // middleware crash — biarkan request lewat. Pengecekan login tetap
  // dilakukan lagi di tiap layout, jadi tidak ada halaman bocor.
  if (!url || !anon) {
    console.error(
      '[middleware] Supabase env belum lengkap. Cek NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel.'
    )
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Belum login dan bukan di /login → redirect ke /login
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (err) {
    // Jangan jatuhkan seluruh app kalau ada gangguan sesaat ke Supabase.
    // Layout tetap memverifikasi ulang, jadi aman.
    console.error('[middleware] gagal memeriksa sesi:', err)
    return NextResponse.next({ request })
  }
}git add .