import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import PenggunaClient from './pengguna-client'

export default async function PenggunaPage() {
  const supabase = await createClient()

  // Ambil semua profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nama, is_super_admin, created_at')
    .order('created_at', { ascending: false })

  // Ambil semua institusi
  const { data: institusi } = await supabase
    .from('institusi')
    .select('id, nama, jenis')
    .order('id')

  // Ambil semua assignment
  const { data: assignments } = await supabase
    .from('user_institusi')
    .select('id, user_id, institusi_id, peran')

  // Ambil email dari auth.users pake admin client
  const admin = createAdminClient()
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(
    authData.users.map((u) => [u.id, u.email ?? ''])
  )

  // Enrich profiles
  const users =
    profiles?.map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? '',
      assignments:
        assignments?.filter((a) => a.user_id === p.id).map((a) => ({
          ...a,
          institusi: institusi?.find((i) => i.id === a.institusi_id),
        })) ?? [],
    })) ?? []

  return (
    <PenggunaClient
      users={users}
      institusi={institusi ?? []}
    />
  )
}