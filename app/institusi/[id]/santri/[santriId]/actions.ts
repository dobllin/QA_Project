'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function assertCanInputProgress(
  santriId: string,
  kategoriId: number
): Promise<string> {
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

  if (profile?.is_super_admin) return user.id

  const { data: assignment } = await supabase
    .from('ustadz_santri')
    .select('id')
    .eq('ustadz_id', user.id)
    .eq('santri_id', santriId)
    .eq('kategori_id', kategoriId)
    .maybeSingle()

  if (!assignment) {
    throw new Error('Kamu bukan pengampu santri ini di kategori terpilih')
  }

  return user.id
}

export async function createProgres(
  institusiId: number,
  santriId: string,
  formData: FormData
) {
  const kategoriId = Number(formData.get('kategori_id'))
  if (!kategoriId) return { error: 'Kategori tidak valid' }

  const ustadzId = await assertCanInputProgress(santriId, kategoriId)

  const tanggal =
    String(formData.get('tanggal') ?? '').trim() ||
    new Date().toISOString().split('T')[0]

  const asText = (key: string): string | null => {
    const v = String(formData.get(key) ?? '').trim()
    return v || null
  }
  const asInt = (key: string): number | null => {
    const raw = formData.get(key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isNaN(n) ? null : n
  }
  const asBool = (key: string): boolean | null => {
    const raw = formData.get(key)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  }

  const admin = createAdminClient()
  const { error } = await admin.from('progress').insert({
    santri_id: santriId,
    ustadz_id: ustadzId,
    kategori_id: kategoriId,
    institusi_id: institusiId,
    tanggal,

    // Jenis kegiatan + lancar
    jenis_setoran: asText('jenis_setoran'),
    lancar: asBool('lancar'),

    // Tahfiz
    surah_mulai: asText('surah_mulai'),
    ayat_mulai: asInt('ayat_mulai'),
    surah_selesai: asText('surah_selesai'),
    ayat_selesai: asInt('ayat_selesai'),

    // Kitab
    kitab_nama: asText('kitab_nama'),
    bab: asText('bab'),
    halaman_mulai: asInt('halaman_mulai'),
    halaman_selesai: asInt('halaman_selesai'),

    // Iqro
    iqro_jilid: asInt('iqro_jilid'),
    iqro_halaman: asInt('iqro_halaman'),

    // Shared
    kualitas: asText('kualitas'),
    catatan: asText('catatan'),
  })

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/santri/${santriId}`)
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true }
}

export async function deleteProgres(
  institusiId: number,
  progresId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak masuk')

  const { data: progres } = await supabase
    .from('progress')
    .select('ustadz_id, santri_id, institusi_id')
    .eq('id', progresId)
    .single()

  if (!progres) return { error: 'Data tidak ditemukan' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isSuperAdmin && progres.ustadz_id !== user.id) {
    const { data: adminCheck } = await supabase
      .from('user_institusi')
      .select('id')
      .eq('user_id', user.id)
      .eq('institusi_id', progres.institusi_id)
      .eq('peran', 'admin')

    if (!adminCheck || adminCheck.length === 0) {
      return { error: 'Tidak diizinkan' }
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('progress').delete().eq('id', progresId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/santri/${progres.santri_id}`)
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true }
}