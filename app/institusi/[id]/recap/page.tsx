import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import RecapClient from './recap-client'

export default async function RecapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const institusiId = Number(id)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .eq('id', institusiId)
    .single()

  if (!institusi) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  let isAdmin = profile?.is_super_admin ?? false
  if (!isAdmin) {
    const { data: perans } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .eq('peran', 'admin')
    isAdmin = (perans?.length ?? 0) > 0
  }

  // Get santri IDs for this institusi
  const { data: santriInInstitusi } = await supabase
    .from('santri')
    .select('id, nama')
    .eq('institusi_id', institusiId)

  const santriIds = (santriInInstitusi ?? []).map((s) => s.id)

  if (santriIds.length === 0) {
    return (
      <RecapClient
        institusi={institusi}
        logs={[]}
        isAdmin={isAdmin}
      />
    )
  }

  // Fetch poin log
  let logsQuery = supabase
    .from('poin_log')
    .select(
      `
      id, jenis, nilai_perubahan, keterangan, tanggal, ustadz_id, santri_id, created_at,
      santri(id, nama, kelas, halaqoh),
      profiles:ustadz_id(nama)
    `
    )
    .in('santri_id', santriIds)
    .order('created_at', { ascending: false })
    .limit(100)

  // Ustadz cuma lihat log yang dia input
  if (!isAdmin) {
    logsQuery = logsQuery.eq('ustadz_id', user.id)
  }

  const { data: logs } = await logsQuery

  return (
    <RecapClient
      institusi={institusi}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs={(logs ?? []) as any}
      isAdmin={isAdmin}
    />
  )
}