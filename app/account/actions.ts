'use server'

// ============================================================
// FILE: app/account/actions.ts
// User mengubah password AKUNNYA SENDIRI (bukan super admin).
// Pakai createClient biasa (bukan admin) — Supabase mengizinkan user
// mengubah password dirinya sendiri lewat auth.updateUser().
// ============================================================

import { createClient } from '@/utils/supabase/server'

export async function ubahPasswordSendiri(passwordBaru: string) {
  const pw = (passwordBaru ?? '').trim()

  if (pw.length < 6) {
    return { error: 'Password minimal 6 karakter.' }
  }

  const supabase = await createClient()

  // Pastikan memang sedang login.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Sesi habis. Silakan login ulang.' }
  }

  const { error } = await supabase.auth.updateUser({ password: pw })
  if (error) {
    return { error: 'Gagal ganti password: ' + error.message }
  }

  return { success: true }
}