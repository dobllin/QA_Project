// ============================================================
// FILE: proxy.ts  (dulu middleware.ts)
//
// Next.js 16 mengganti konvensi "middleware" menjadi "proxy".
// Nama file HARUS proxy.ts, dan fungsi yang diekspor HARUS bernama
// proxy (bukan middleware). Memakai nama lama di Next 16 membuat
// Vercel gagal menjalankannya -> MIDDLEWARE_INVOCATION_FAILED.
// ============================================================

import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}