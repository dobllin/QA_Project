'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function assertInstitusiAdmin(institusiId: number) {
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

  if (profile?.is_super_admin) return

  const { data: assignments } = await supabase
    .from('user_institusi')
    .select('id')
    .eq('user_id', user.id)
    .eq('institusi_id', institusiId)
    .eq('peran', 'admin')

  if (!assignments || assignments.length === 0) {
    throw new Error('Bukan admin institusi ini')
  }
}

export async function assignSantriToUstadz(
  institusiId: number,
  formData: FormData
) {
  await assertInstitusiAdmin(institusiId)

  const ustadzId = String(formData.get('ustadz_id') ?? '')
  const santriId = String(formData.get('santri_id') ?? '')
  const kategoriId = Number(formData.get('kategori_id'))

  if (!ustadzId || !santriId || !kategoriId) {
    return { error: 'Semua field wajib diisi' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('ustadz_santri').insert({
    ustadz_id: ustadzId,
    santri_id: santriId,
    kategori_id: kategoriId,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Santri sudah di-assign ke kategori ini' }
    }
    return { error: error.message }
  }

  revalidatePath(`/institusi/${institusiId}/pengajar`)
  return { success: true }
}

export async function unassignSantri(
  institusiId: number,
  assignmentId: string
) {
  await assertInstitusiAdmin(institusiId)

  const admin = createAdminClient()
  const { error } = await admin
    .from('ustadz_santri')
    .delete()
    .eq('id', assignmentId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/pengajar`)
  return { success: true }
}