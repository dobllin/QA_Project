'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'



export type CustomField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

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

export async function createKategori(institusiId: number, formData: FormData) {
  await assertInstitusiAdmin(institusiId)

  const nama = String(formData.get('nama') ?? '').trim()
  if (!nama) return { error: 'Nama kategori wajib diisi' }
  if (nama.length > 60) return { error: 'Nama kategori terlalu panjang' }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('kategori')
    .select('id')
    .eq('institusi_id', institusiId)
    .ilike('nama', nama)
    .maybeSingle()

  if (existing) {
    return { error: `Kategori "${nama}" sudah ada` }
  }

  const { error } = await admin
    .from('kategori')
    .insert({ nama, institusi_id: institusiId })

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kategori`)
  return { success: true }
}

export async function deleteKategori(institusiId: number, kategoriId: number) {
  await assertInstitusiAdmin(institusiId)

  const admin = createAdminClient()

  const { data: kat } = await admin
    .from('kategori')
    .select('id, institusi_id')
    .eq('id', kategoriId)
    .single()

  if (!kat || kat.institusi_id !== institusiId) {
    return { error: 'Kategori tidak ditemukan di institusi ini' }
  }

  const [{ count: assignCount }, { count: progresCount }] = await Promise.all([
    admin
      .from('ustadz_santri')
      .select('*', { count: 'exact', head: true })
      .eq('kategori_id', kategoriId),
    admin
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('kategori_id', kategoriId),
  ])

  if ((assignCount ?? 0) > 0 || (progresCount ?? 0) > 0) {
    return {
      error: `Kategori ini masih dipakai (${assignCount ?? 0} pengampuan, ${
        progresCount ?? 0
      } setoran). Hapus dulu semua penugasan.`,
    }
  }

  const { error } = await admin.from('kategori').delete().eq('id', kategoriId)
  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kategori`)
  return { success: true }
}

/**
 * Assign 1 santri ke 1 ustadz di kategori tertentu.
 */
export async function assignSantriKategori(
  institusiId: number,
  formData: FormData
) {
  await assertInstitusiAdmin(institusiId)

  const ustadzId = String(formData.get('ustadz_id') ?? '')
  const santriId = String(formData.get('santri_id') ?? '')
  const kategoriId = Number(formData.get('kategori_id'))

  if (!ustadzId || !santriId || !kategoriId) {
    return { error: 'Ustadz, santri, dan kategori wajib dipilih' }
  }

  const admin = createAdminClient()

  const { data: kat } = await admin
    .from('kategori')
    .select('id, institusi_id')
    .eq('id', kategoriId)
    .single()
  if (!kat || kat.institusi_id !== institusiId) {
    return { error: 'Kategori tidak valid' }
  }

  const { data: santri } = await admin
    .from('santri')
    .select('id, institusi_id')
    .eq('id', santriId)
    .single()
  if (!santri || santri.institusi_id !== institusiId) {
    return { error: 'Santri tidak valid' }
  }

  const { data: uInst } = await admin
    .from('user_institusi')
    .select('id, peran')
    .eq('user_id', ustadzId)
    .eq('institusi_id', institusiId)
    .in('peran', ['ustadz', 'ustadzah'])
    .maybeSingle()
  if (!uInst) {
    return { error: 'Ustadz bukan pengajar di institusi ini' }
  }

  const { error } = await admin.from('ustadz_santri').insert({
    ustadz_id: ustadzId,
    santri_id: santriId,
    kategori_id: kategoriId,
  })

  if (error) {
    if (error.code === '23505') {
      return {
        error: 'Santri ini sudah di-assign ke ustadz tersebut di kategori ini',
      }
    }
    return { error: error.message }
  }

  revalidatePath(`/institusi/${institusiId}/kategori`)
  return { success: true }
}

export async function unassignFromKategori(
  institusiId: number,
  assignmentId: string
) {
  await assertInstitusiAdmin(institusiId)

  const admin = createAdminClient()

  const { data: assignment } = await admin
    .from('ustadz_santri')
    .select('id, santri:santri_id(institusi_id)')
    .eq('id', assignmentId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const santriInstId = (assignment?.santri as any)?.institusi_id
  if (!assignment || santriInstId !== institusiId) {
    return { error: 'Penugasan tidak ditemukan' }
  }

  const { error } = await admin
    .from('ustadz_santri')
    .delete()
    .eq('id', assignmentId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kategori`)
  return { success: true }
}
// ============================================================
// Update custom fields per kategori
// ============================================================

export async function updateKategoriFields(
  institusiId: number,
  kategoriId: number,
  fields: CustomField[]
) {
  await assertInstitusiAdmin(institusiId)

  if (!Array.isArray(fields)) return { error: 'Format tidak valid' }

  const seenKeys = new Set<string>()
  for (const f of fields) {
    if (!f.key || !f.label || !f.type) {
      return { error: 'Setiap field harus punya key, label, dan type' }
    }
    if (f.label.length > 60) {
      return { error: `Label "${f.label}" terlalu panjang (max 60 karakter)` }
    }
    if (seenKeys.has(f.key)) {
      return { error: 'Ada field dengan key duplikat' }
    }
    seenKeys.add(f.key)
    if (!['text', 'number', 'select'].includes(f.type)) {
      return { error: `Type "${f.type}" tidak dikenal` }
    }
    if (f.type === 'select') {
      if (!Array.isArray(f.options) || f.options.length === 0) {
        return { error: `Field "${f.label}" tipe select harus punya minimal 1 pilihan` }
      }
    }
  }

  const admin = createAdminClient()

  const { data: kat } = await admin
    .from('kategori')
    .select('id, institusi_id')
    .eq('id', kategoriId)
    .single()

  if (!kat || kat.institusi_id !== institusiId) {
    return { error: 'Kategori tidak ditemukan' }
  }

  const { error } = await admin
    .from('kategori')
    .update({ custom_fields: fields })
    .eq('id', kategoriId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kategori`)
  return { success: true }
}