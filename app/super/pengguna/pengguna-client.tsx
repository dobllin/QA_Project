'use client'

import { useState, useTransition } from 'react'
import {
  createUser,
  assignToInstitusi,
  removeFromInstitusi,
  deleteUser,
} from './actions'

type Institusi = { id: number; nama: string; jenis: string }
type Assignment = {
  id: string
  user_id: string
  institusi_id: number
  peran: string
  institusi?: Institusi
}
type User = {
  id: string
  nama: string
  email: string
  is_super_admin: boolean
  created_at: string
  assignments: Assignment[]
}

const peranLabel: Record<string, string> = {
  ustadz: 'Ustadz',
  ustadzah: 'Ustadzah',
  admin: 'Admin institusi',
}

export default function PenggunaClient({
  users,
  institusi,
}: {
  users: User[]
  institusi: Institusi[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [assigningTo, setAssigningTo] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
            Kelola
          </div>
          <h1 className="font-display text-5xl text-forest-800 leading-none">
            Pengguna
          </h1>
          <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
            Semua akun yang bisa masuk ke sistem — super admin, admin institusi,
            ustadz, dan ustadzah.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 bg-forest-700 hover:bg-forest-800 text-cream-50 text-sm font-medium px-5 py-2.5 rounded-lg transition"
        >
          {showForm ? 'Batal' : 'Tambah pengguna'}
        </button>
      </div>

      <div className="divider-double mb-8" />

      {showForm && (
        <TambahForm
          institusi={institusi}
          onDone={() => setShowForm(false)}
        />
      )}

      <div className="space-y-3">
        {users.length === 0 && (
          <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
            <p className="text-sm text-ink-500">Belum ada pengguna terdaftar.</p>
          </div>
        )}

        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            institusi={institusi}
            assigningOpen={assigningTo === user.id}
            onToggleAssign={() =>
              setAssigningTo((v) => (v === user.id ? null : user.id))
            }
          />
        ))}
      </div>
    </div>
  )
}

function TambahForm({
  institusi,
  onDone,
}: {
  institusi: Institusi[]
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-6 mb-6">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
        Baru
      </div>
      <h2 className="font-display text-2xl text-forest-800 mb-5">
        Tambah pengguna
      </h2>

      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null)
            const result = await createUser(fd)
            if (result?.error) setError(result.error)
            else onDone()
          })
        }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Nama lengkap
          </label>
          <input
            name="nama"
            required
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="Ustadz Ahmad / Ustadzah Fatimah"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="ahmad@contoh.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Password sementara
          </label>
          <input
            name="password"
            type="text"
            required
            minLength={6}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="Min. 6 karakter"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Peran
          </label>
          <select
            name="peran"
            required
            defaultValue=""
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="" disabled>
              Pilih peran...
            </option>
            <option value="ustadz">Ustadz</option>
            <option value="ustadzah">Ustadzah</option>
            <option value="admin">Admin institusi</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Institusi
          </label>
          <select
            name="institusi_id"
            required
            defaultValue=""
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="" disabled>
              Pilih institusi...
            </option>
            {institusi.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nama}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="sm:col-span-2 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={isPending}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan pengguna'}
          </button>
          <span className="text-xs text-ink-500">
            Bisa ditugaskan ke institusi tambahan setelah dibuat
          </span>
        </div>
      </form>
    </div>
  )
}

function UserCard({
  user,
  institusi,
  assigningOpen,
  onToggleAssign,
}: {
  user: User
  institusi: Institusi[]
  assigningOpen: boolean
  onToggleAssign: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-forest-800">{user.nama}</h3>
            {user.is_super_admin && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-copper-600 bg-copper-500/10 border border-copper-500/30 px-2 py-0.5 rounded">
                Super Admin
              </span>
            )}
          </div>
          <div className="text-xs text-ink-500">{user.email}</div>
        </div>
        {!user.is_super_admin && (
          <button
            onClick={() => {
              if (confirm(`Hapus akun ${user.nama}?`)) {
                startTransition(async () => {
                  await deleteUser(user.id)
                })
              }
            }}
            disabled={isPending}
            className="text-xs text-error-500 hover:underline disabled:opacity-50"
          >
            Hapus
          </button>
        )}
      </div>

      {user.assignments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line/60">
          <div className="text-[10px] font-medium uppercase tracking-widest text-ink-500 mb-2">
            Tugas mengajar
          </div>
          <div className="flex flex-wrap gap-2">
            {user.assignments.map((a) => (
              <div
                key={a.id}
                className="group inline-flex items-center gap-2 bg-cream-100 border border-line rounded-lg px-3 py-1.5"
              >
                <div className="text-sm">
                  <span className="text-forest-800 font-medium">
                    {a.institusi?.nama}
                  </span>
                  <span className="text-ink-500 ml-1.5">
                    · {peranLabel[a.peran] ?? a.peran}
                  </span>
                </div>
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await removeFromInstitusi(a.id)
                    })
                  }}
                  disabled={isPending}
                  className="text-ink-400 hover:text-error-500 text-xs disabled:opacity-50"
                  aria-label="Cabut"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user.is_super_admin && (
        <div className="mt-4">
          {!assigningOpen ? (
            <button
              onClick={onToggleAssign}
              className="text-xs text-forest-700 hover:text-forest-800 underline underline-offset-4"
            >
              + Tugaskan ke institusi tambahan
            </button>
          ) : (
            <AssignForm
              userId={user.id}
              institusi={institusi}
              onDone={onToggleAssign}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AssignForm({
  userId,
  institusi,
  onDone,
}: {
  userId: string
  institusi: Institusi[]
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          setError(null)
          fd.append('user_id', userId)
          const result = await assignToInstitusi(fd)
          if (result?.error) setError(result.error)
          else onDone()
        })
      }}
      className="bg-cream-100 border border-line rounded-lg p-4 flex flex-wrap items-end gap-3"
    >
      <div className="flex-1 min-w-[160px]">
        <label className="block text-[10px] uppercase tracking-widest text-ink-500 mb-1">
          Institusi
        </label>
        <select
          name="institusi_id"
          required
          defaultValue=""
          className="w-full px-2.5 py-1.5 bg-cream-50 border border-line rounded text-sm focus:outline-none focus:border-forest-700"
        >
          <option value="" disabled>
            Pilih...
          </option>
          {institusi.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nama}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-ink-500 mb-1">
          Sebagai
        </label>
        <select
          name="peran"
          required
          defaultValue="ustadz"
          className="px-2.5 py-1.5 bg-cream-50 border border-line rounded text-sm focus:outline-none focus:border-forest-700"
        >
          <option value="ustadz">Ustadz</option>
          <option value="ustadzah">Ustadzah</option>
          <option value="admin">Admin institusi</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-xs font-medium px-4 py-1.5 rounded transition"
      >
        {isPending ? 'Menyimpan...' : 'Tugaskan'}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-xs text-ink-500 hover:text-ink-900"
      >
        Batal
      </button>
      {error && (
        <div className="w-full text-xs text-error-500 mt-1">{error}</div>
      )}
    </form>
  )
}