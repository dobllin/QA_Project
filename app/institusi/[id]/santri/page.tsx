import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SantriClient from './santri-client'

export default async function SantriPage({
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  // Cek apakah user adalah admin institusi ini (atau super admin)
  let isAdmin = profile?.is_super_admin ?? false
  if (!isAdmin) {
    const { data: assignments } = await supabase
      .from('user_institusi')
      .select('peran')
      .eq('user_id', user.id)
      .eq('institusi_id', institusiId)
      .eq('peran', 'admin')
    isAdmin = (assignments?.length ?? 0) > 0
  }

  // Fetch santri
  const { data: santri } = await supabase
    .from('santri')
    .select('id, nama, kelas, halaqoh, tahun_masuk')
    .eq('institusi_id', institusiId)
    .order('nama')

  return (
    <SantriClient
      santri={santri ?? []}
      institusiId={institusiId}
      isAdmin={isAdmin}
    />
  )
}