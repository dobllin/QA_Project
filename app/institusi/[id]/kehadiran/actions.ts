'use server'

// ============================================================
// FILE: app/institusi/[id]/kehadiran/actions.ts
// ============================================================

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export type StatusKehadiran = 'hadir' | 'izin' | 'sakit' | 'alpha'

async function assertInstitusiAdmin(institusiId: number): Promise<string> {
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

export async function setKehadiran(
  institusiId: number,
  santriId: string,
  tanggal: string,
  status: StatusKehadiran,
  keterangan: string | null = null
) {
  const userId = await assertInstitusiAdmin(institusiId)

  if (!['hadir', 'izin', 'sakit', 'alpha'].includes(status)) {
    return { error: 'Status tidak valid' }
  }

  const admin = createAdminClient()

  // Verifikasi santri ada di institusi
  const { data: santri } = await admin
    .from('santri')
    .select('id, institusi_id')
    .eq('id', santriId)
    .single()

  if (!santri || santri.institusi_id !== institusiId) {
    return { error: 'Santri tidak valid' }
  }

  // Upsert — kalo udah ada di tanggal itu, update; kalo belum, insert
  const { error } = await admin
    .from('kehadiran')
    .upsert(
      {
        santri_id: santriId,
        institusi_id: institusiId,
        tanggal,
        status,
        keterangan,
        dicatat_oleh: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'santri_id,tanggal' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kehadiran`)
  return { success: true }
}

export async function clearKehadiran(
  institusiId: number,
  santriId: string,
  tanggal: string
) {
  await assertInstitusiAdmin(institusiId)

  const admin = createAdminClient()

  const { error } = await admin
    .from('kehadiran')
    .delete()
    .eq('santri_id', santriId)
    .eq('tanggal', tanggal)
    .eq('institusi_id', institusiId)

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kehadiran`)
  return { success: true }
}

export async function bulkSetHadir(
  institusiId: number,
  tanggal: string,
  santriIds: string[]
) {
  const userId = await assertInstitusiAdmin(institusiId)

  if (!Array.isArray(santriIds) || santriIds.length === 0) {
    return { error: 'Tidak ada santri dipilih' }
  }

  const admin = createAdminClient()

  const rows = santriIds.map((sid) => ({
    santri_id: sid,
    institusi_id: institusiId,
    tanggal,
    status: 'hadir' as const,
    keterangan: null,
    dicatat_oleh: userId,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from('kehadiran')
    .upsert(rows, { onConflict: 'santri_id,tanggal' })

  if (error) return { error: error.message }

  revalidatePath(`/institusi/${institusiId}/kehadiran`)
  return { success: true }
}