'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

type CustomField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

/**
 * Cek: user boleh input setoran untuk santri di kategori ini?
 * Boleh kalau:
 *   1. Super admin, ATAU
 *   2. Ustadz yang di-assign ke santri+kategori ini, ATAU
 *   3. Admin institusi tempat santri ini terdaftar
 */
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

  // Cek ustadz assignment
  const { data: assignment } = await supabase
    .from('ustadz_santri')
    .select('id')
    .eq('ustadz_id', user.id)
    .eq('santri_id', santriId)
    .eq('kategori_id', kategoriId)
    .maybeSingle()

  if (assignment) return user.id

  // Fallback: cek admin institusi
  const { data: santri } = await supabase
    .from('santri')
    .select('institusi_id')
    .eq('id', santriId)
    .single()

  if (santri) {
    const { data: adminCheck } = await supabase
      .from('user_institusi')
      .select('id')
      .eq('user_id', user.id)
      .eq('institusi_id', santri.institusi_id)
      .eq('peran', 'admin')

    if (adminCheck && adminCheck.length > 0) return user.id
  }

  throw new Error('Kamu bukan pengampu santri ini di kategori terpilih')
}

async function assertCanManagePoin(santriId: string): Promise<string> {
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

  const { data: santri } = await supabase
    .from('santri')
    .select('institusi_id')
    .eq('id', santriId)
    .single()

  if (!santri) throw new Error('Santri tidak ditemukan')

  const { data: adminCheck } = await supabase
    .from('user_institusi')
    .select('id')
    .eq('user_id', user.id)
    .eq('institusi_id', santri.institusi_id)
    .eq('peran', 'admin')

  if (adminCheck && adminCheck.length > 0) return user.id

  const { data: ustadzCheck } = await supabase
    .from('ustadz_santri')
    .select('id')
    .eq('ustadz_id', user.id)
    .eq('santri_id', santriId)
    .limit(1)

  if (!ustadzCheck || ustadzCheck.length === 0) {
    throw new Error('Tidak diizinkan')
  }

  return user.id
}

async function extractCustomValues(
  kategoriId: number,
  formData: FormData
): Promise<Record<string, string | number | null>> {
  const admin = createAdminClient()
  const { data: kat } = await admin
    .from('kategori')
    .select('custom_fields')
    .eq('id', kategoriId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields = Array.isArray((kat as any)?.custom_fields)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((kat as any).custom_fields as CustomField[])
    : []

  const values: Record<string, string | number | null> = {}
  for (const f of fields) {
    const raw = formData.get(`custom_${f.key}`)
    if (raw === null || raw === undefined || raw === '') {
      values[f.key] = null
      continue
    }
    if (f.type === 'number') {
      const n = Number(raw)
      values[f.key] = Number.isNaN(n) ? null : n
    } else {
      values[f.key] = String(raw).trim() || null
    }
  }
  return values
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

  const customValues = await extractCustomValues(kategoriId, formData)

  const admin = createAdminClient()
  const { error } = await admin.from('progress').insert({
    santri_id: santriId,
    ustadz_id: ustadzId,
    kategori_id: kategoriId,
    institusi_id: institusiId,
    tanggal,
    jenis_setoran: asText('jenis_setoran'),
    lancar: asBool('lancar'),
    surah_mulai: asText('surah_mulai'),
    ayat_mulai: asInt('ayat_mulai'),
    surah_selesai: asText('surah_selesai'),
    ayat_selesai: asInt('ayat_selesai'),
    kitab_nama: asText('kitab_nama'),
    bab: asText('bab'),
    halaman_mulai: asInt('halaman_mulai'),
    halaman_selesai: asInt('halaman_selesai'),
    absen: asBool('absen'),
    kendala: asText('kendala'),
    tersampaikan: asBool('tersampaikan'),
    iqro_jilid: asInt('iqro_jilid'),
    iqro_halaman: asInt('iqro_halaman'),
    kualitas: asText('kualitas'),
    catatan: asText('catatan'),
    custom_values: customValues,
  })

  if (error) {
    // 23505 = unique violation dari index progress_harian_unik
    // (santri_id, kategori_id, tanggal). Aturannya 1 setoran per hari.
    if (error.code === '23505') {
      return {
        error:
          'Setoran santri ini di kategori ini untuk tanggal tersebut sudah ada. Edit entri yang sudah ada, jangan input dua kali.',
      }
    }
    return { error: error.message }
  }

  revalidatePath(`/institusi/${institusiId}/santri/${santriId}`)
  revalidatePath(`/institusi/${institusiId}/santri`)
  revalidatePath(`/institusi/${institusiId}/kategori`)
  revalidatePath(`/institusi/${institusiId}`)
  return { success: true }
}

export async function updateProgres(
  institusiId: number,
  progresId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak masuk')

  const { data: progres } = await supabase
    .from('progress')
    .select('ustadz_id, santri_id, institusi_id, kategori_id')
    .eq('id', progresId)
    .single()

  if (!progres) return { error: 'Data tidak ditemukan' }
  if (progres.institusi_id !== institusiId) {
    return { error: 'Data tidak valid' }
  }

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

  const tanggalRaw = String(formData.get('tanggal') ?? '').trim()
  const customValues = await extractCustomValues(progres.kategori_id, formData)

  const admin = createAdminClient()
  const { error } = await admin
    .from('progress')
    .update({
      ...(tanggalRaw ? { tanggal: tanggalRaw } : {}),
      jenis_setoran: asText('jenis_setoran'),
      lancar: asBool('lancar'),
      surah_mulai: asText('surah_mulai'),
      ayat_mulai: asInt('ayat_mulai'),
      surah_selesai: asText('surah_selesai'),
      ayat_selesai: asInt('ayat_selesai'),
      kitab_nama: asText('kitab_nama'),
      bab: asText('bab'),
      halaman_mulai: asInt('halaman_mulai'),
      halaman_selesai: asInt('halaman_selesai'),
      absen: asBool('absen'),
      kendala: asText('kendala'),
      tersampaikan: asBool('tersampaikan'),
      iqro_jilid: asInt('iqro_jilid'),
      iqro_halaman: asInt('iqro_halaman'),
      kualitas: asText('kualitas'),
      catatan: asText('catatan'),
      custom_values: customValues,
    })
    .eq('id', progresId)

  if (error) {
    if (error.code === '23505') {
      return {
        error:
          'Sudah ada setoran lain untuk santri & kategori ini di tanggal tersebut.',
      }
    }
    return { error: error.message }
  }

  revalidatePath(`/institusi/${institusiId}/santri/${progres.santri_id}`)
  revalidatePath(`/institusi/${institusiId}/santri`)
  revalidatePath(`/institusi/${institusiId}/kategori`)
  revalidatePath(`/institusi/${institusiId}`)
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
  revalidatePath(`/institusi/${institusiId}/kategori`)
  revalidatePath(`/institusi/${institusiId}`)
  return { success: true }
}

// ============================================
// POIN MANAGEMENT
// ============================================

const NILAI_MAP: Record<string, number> = {
  kesalahan_ringan: -1,
  kesalahan_sedang: -5,
  kesalahan_parah: -10,
  kebaikan: 5,
}

export async function addPoinLog(
  institusiId: number,
  santriId: string,
  jenis: 'kesalahan_ringan' | 'kesalahan_sedang' | 'kesalahan_parah' | 'kebaikan',
  keterangan: string | null = null
) {
  const ustadzId = await assertCanManagePoin(santriId)

  const nilai_perubahan = NILAI_MAP[jenis]
  if (nilai_perubahan === undefined) return { error: 'Jenis tidak valid' }

  const admin = createAdminClient()

  const { error: logError } = await admin.from('poin_log').insert({
    santri_id: santriId,
    ustadz_id: ustadzId,
    jenis,
    nilai_perubahan,
    keterangan,
  })

  if (logError) return { error: logError.message }

  const { data: currentSantri } = await admin
    .from('santri')
    .select('poin')
    .eq('id', santriId)
    .single()

  if (!currentSantri) return { error: 'Santri tidak ditemukan' }

  const newPoin = (currentSantri.poin ?? 100) + nilai_perubahan

  const { error: updateError } = await admin
    .from('santri')
    .update({ poin: newPoin })
    .eq('id', santriId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/institusi/${institusiId}/santri/${santriId}`)
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true, newPoin }
}

export async function deletePoinLog(
  institusiId: number,
  logId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak masuk')

  const { data: log } = await supabase
    .from('poin_log')
    .select('santri_id, nilai_perubahan, ustadz_id')
    .eq('id', logId)
    .single()

  if (!log) return { error: 'Log tidak ditemukan' }

  await assertCanManagePoin(log.santri_id)

  const admin = createAdminClient()

  const { error: deleteError } = await admin
    .from('poin_log')
    .delete()
    .eq('id', logId)

  if (deleteError) return { error: deleteError.message }

  const { data: currentSantri } = await admin
    .from('santri')
    .select('poin')
    .eq('id', log.santri_id)
    .single()

  if (currentSantri) {
    const revertedPoin = (currentSantri.poin ?? 100) - log.nilai_perubahan
    await admin
      .from('santri')
      .update({ poin: revertedPoin })
      .eq('id', log.santri_id)
  }

  revalidatePath(`/institusi/${institusiId}/santri/${log.santri_id}`)
  revalidatePath(`/institusi/${institusiId}/santri`)
  return { success: true }
}