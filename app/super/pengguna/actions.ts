'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak masuk')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) throw new Error('Bukan super admin')
}

const VALID_PERAN = ['admin', 'ustadz', 'ustadzah']

export async function createUser(formData: FormData) {
  await assertSuperAdmin()

  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const nama = String(formData.get('nama') ?? '').trim()
  const peran = String(formData.get('peran') ?? '')
  const institusiIdRaw = formData.get('institusi_id')
  const institusiId = institusiIdRaw ? Number(institusiIdRaw) : null

  if (!email || !password || !nama) {
    return { error: 'Nama, email, dan password wajib diisi' }
  }
  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter' }
  }
  if (!peran || !institusiId) {
    return { error: 'Peran dan institusi wajib dipilih' }
  }
  if (!VALID_PERAN.includes(peran)) {
    return { error: 'Peran tidak valid' }
  }

  const admin = createAdminClient()

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return { error: authError?.message ?? 'Gagal membuat akun' }
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: newUser.user.id,
    nama,
    is_super_admin: false,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  const { error: assignError } = await admin.from('user_institusi').insert({
    user_id: newUser.user.id,
    institusi_id: institusiId,
    peran,
  })

  if (assignError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { error: 'Gagal menugaskan ke institusi: ' + assignError.message }
  }

  revalidatePath('/super/pengguna')
  return { success: true }
}

export async function assignToInstitusi(formData: FormData) {
  await assertSuperAdmin()

  const userId = String(formData.get('user_id') ?? '')
  const institusiId = Number(formData.get('institusi_id'))
  const peran = String(formData.get('peran') ?? '')

  if (!userId || !institusiId || !VALID_PERAN.includes(peran)) {
    return { error: 'Data tidak valid' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('user_institusi').insert({
    user_id: userId,
    institusi_id: institusiId,
    peran,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Sudah ditugaskan sebelumnya' }
    }
    return { error: error.message }
  }

  revalidatePath('/super/pengguna')
  return { success: true }
}

export async function removeFromInstitusi(assignmentId: string) {
  await assertSuperAdmin()

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_institusi')
    .delete()
    .eq('id', assignmentId)

  if (error) return { error: error.message }

  revalidatePath('/super/pengguna')
  return { success: true }
}

export async function deleteUser(userId: string) {
  await assertSuperAdmin()

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) return { error: error.message }

  revalidatePath('/super/pengguna')
  return { success: true }
}