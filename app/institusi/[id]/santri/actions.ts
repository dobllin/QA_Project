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

export async function createSantri(institusiId: number, formData: FormData) {
  await assertInstitusiAdmin(institusiId)

  const nama = String(formData.get('nama') ?? '').trim()
  const kelas = String(formData.get('kelas') ?? '').trim()
  const halaqoh = String(formData.get('halaqoh') ?? '').trim()
  const tahunMasukRaw = formData.get('tahun_masuk')
  const tahunMasuk = tahunMasukRaw ? Number(tahunMasukRaw) : null
  const waliKelasId = String(formData.get('wali_kelas_id') ?? '').trim() || null

  if (!nama) return { error: 'Nama wajib diisi' }

  const admin = createAdminClient()
  const { error } = await admin.from('santri').insert({
    nama,
    kelas: kelas || null,
    halaqoh: halaqoh || null,
    tahun_masuk: tahunMasuk,
    wali_kelas_id: waliKelasId,
    institusi_id: institusiId,
  })

  if (error) return { error: error.message }
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true }
}

export async function updateSantri(
  institusiId: number,
  santriId: string,
  formData: FormData
) {
  await assertInstitusiAdmin(institusiId)

  const nama = String(formData.get('nama') ?? '').trim()
  const kelas = String(formData.get('kelas') ?? '').trim()
  const halaqoh = String(formData.get('halaqoh') ?? '').trim()
  const tahunMasukRaw = formData.get('tahun_masuk')
  const tahunMasuk = tahunMasukRaw ? Number(tahunMasukRaw) : null
  const waliKelasId = String(formData.get('wali_kelas_id') ?? '').trim() || null

  if (!nama) return { error: 'Nama wajib diisi' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('santri')
    .update({
      nama,
      kelas: kelas || null,
      halaqoh: halaqoh || null,
      tahun_masuk: tahunMasuk,
      wali_kelas_id: waliKelasId,
    })
    .eq('id', santriId)
    .eq('institusi_id', institusiId)

  if (error) return { error: error.message }
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true }
}

export async function deleteSantri(institusiId: number, santriId: string) {
  await assertInstitusiAdmin(institusiId)

  const admin = createAdminClient()
  const { error } = await admin
    .from('santri')
    .delete()
    .eq('id', santriId)
    .eq('institusi_id', institusiId)

  if (error) return { error: error.message }
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true }
}