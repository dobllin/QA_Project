'use server'

// ============================================================
// FILE: app/institusi/[id]/target/actions.ts
// ============================================================

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

  if (profile?.is_super_admin) return user.id

  const { data: assignments } = await supabase
    .from('user_institusi')
    .select('id')
    .eq('user_id', user.id)
    .eq('institusi_id', institusiId)
    .eq('peran', 'admin')

  if (!assignments || assignments.length === 0) {
    throw new Error('Bukan admin institusi ini')
  }

  return user.id
}

// Izinkan admin ATAU ustadz/ustadzah di institusi ini. Mengembalikan
// { userId, isAdmin }. Dipakai createTarget agar ustadz bisa membuat target
// untuk dirinya sendiri, sementara admin bisa untuk siapa saja.
async function assertInstitusiMember(institusiId: number) {
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

  if (profile?.is_super_admin) return { userId: user.id, isAdmin: true }

  const { data: assignments } = await supabase
    .from('user_institusi')
    .select('peran')
    .eq('user_id', user.id)
    .eq('institusi_id', institusiId)
    .in('peran', ['admin', 'ustadz', 'ustadzah'])

  if (!assignments || assignments.length === 0) {
    throw new Error('Bukan anggota institusi ini')
  }
  const isAdmin = assignments.some((a) => (a as { peran: string }).peran === 'admin')
  return { userId: user.id, isAdmin }
}

export async function createTarget(
  institusiId: number,
  formData: FormData
) {
  const { userId: createdBy, isAdmin } = await assertInstitusiMember(institusiId)

  let ustadzId = String(formData.get('ustadz_id') ?? '').trim()
  // Ustadz (bukan admin) hanya boleh membuat target untuk dirinya sendiri.
  if (!isAdmin) {
    ustadzId = createdBy
  }
  const kategoriId = Number(formData.get('kategori_id'))
  const santriId = String(formData.get('santri_id') ?? '').trim() || null
  const judul = String(formData.get('judul') ?? '').trim()
  const deskripsi = String(formData.get('deskripsi') ?? '').trim() || null
  const unitType = String(formData.get('unit_type') ?? 'setoran').trim()
  const targetValue = Number(formData.get('target_value'))
  const targetMulai = String(formData.get('target_mulai') ?? '').trim()
  const targetSelesai = String(formData.get('target_selesai') ?? '').trim()

  if (!ustadzId || !kategoriId || !judul) {
    return { error: 'Ustadz, kategori, dan judul wajib diisi' }
  }
  if (!['setoran', 'ayat', 'halaman', 'juz'].includes(unitType)) {
    return { error: 'Tipe unit tidak valid' }
  }
  if (!targetValue || targetValue <= 0) {
    return { error: 'Target harus lebih dari 0' }
  }
  if (!targetMulai || !targetSelesai) {
    return { error: 'Tanggal mulai dan selesai wajib diisi' }
  }
  if (new Date(targetMulai) >= new Date(targetSelesai)) {
    return { error: 'Tanggal selesai harus setelah tanggal mulai' }
  }

  const admin = createAdminClient()

  // Verifikasi kategori & ustadz di institusi ini
  const { data: kat } = await admin
    .from('kategori')
    .select('id, institusi_id')
    .eq('id', kategoriId)
    .single()
  if (!kat || kat.institusi_id !== institusiId) {
    return { error: 'Kategori tidak valid' }
  }

  const { data: uInst } = await admin
    .from('user_institusi')
    .select('id')
    .eq('user_id', ustadzId)
    .eq('institusi_id', institusiId)
    .in('peran', ['ustadz', 'ustadzah'])
    .maybeSingle()
  if (!uInst) {
    return { error: 'Ustadz bukan pengajar di institusi ini' }
  }

  const { error } = await admin.from('ustadz_target').insert({
    ustadz_id: ustadzId,
    santri_id: santriId,
    kategori_id: kategoriId,
    institusi_id: institusiId,
    judul,
    deskripsi,
    unit_type: unitType,
    target_value: targetValue,
    target_mulai: targetMulai,
    target_selesai: targetSelesai,
    status: 'aktif',
    created_by: createdBy,
  })

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/target`)
  return { success: true }
}

export async function updateTargetStatus(
  institusiId: number,
  targetId: string,
  status: 'aktif' | 'selesai' | 'batal'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak masuk')

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('ustadz_target')
    .select('id, ustadz_id, institusi_id')
    .eq('id', targetId)
    .single()

  if (!target || target.institusi_id !== institusiId) {
    return { error: 'Target tidak ditemukan' }
  }

  // Yg boleh: super admin, admin institusi, atau ustadz pemilik target
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()
  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isSuperAdmin && target.ustadz_id !== user.id) {
    const { data: adminCheck } = await supabase
      .from('user_institusi')
      .select('id')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .eq('peran', 'admin')
    if (!adminCheck || adminCheck.length === 0) {
      return { error: 'Tidak diizinkan' }
    }
  }

  if (!['aktif', 'selesai', 'batal'].includes(status)) {
    return { error: 'Status tidak valid' }
  }

  const { error } = await admin
    .from('ustadz_target')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', targetId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/target`)
  return { success: true }
}

export async function deleteTarget(institusiId: number, targetId: string) {
  await assertInstitusiAdmin(institusiId)

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('ustadz_target')
    .select('id, institusi_id')
    .eq('id', targetId)
    .single()

  if (!target || target.institusi_id !== institusiId) {
    return { error: 'Target tidak ditemukan' }
  }

  const { error } = await admin
    .from('ustadz_target')
    .delete()
    .eq('id', targetId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/target`)
  return { success: true }
}