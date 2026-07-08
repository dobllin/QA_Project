'use client'

import { useState, useTransition } from 'react'
import { createSantri, updateSantri, deleteSantri } from './actions'

type Santri = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  tahun_masuk: number | null
}

export default function SantriClient({
  santri,
  institusiId,
  isAdmin,
}: {
  santri: Santri[]
  institusiId: number
  isAdmin: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
            Kelola
          </div>
          <h1 className="font-display text-5xl text-forest-800 leading-none">
            Santri
          </h1>
          <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
            Data santri yang terdaftar di institusi ini.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm((v) => !v)
              setEditingId(null)
            }}
            className="shrink-0 bg-forest-700 hover:bg-forest-800 text-cream-50 text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            {showForm ? 'Batal' : 'Tambah santri'}
          </button>
        )}
      </div>

      <div className="divider-double mb-8" />

      {showForm && (
        <SantriForm
          institusiId={institusiId}
          onDone={() => setShowForm(false)}
        />
      )}

      <div className="space-y-3">
        {santri.length === 0 && (
          <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
            <p className="text-sm text-ink-500">
              {isAdmin
                ? 'Belum ada santri terdaftar. Klik "Tambah santri" untuk memulai.'
                : 'Belum ada santri terdaftar di institusi ini.'}
            </p>
          </div>
        )}

        {santri.map((s) =>
          editingId === s.id ? (
            <SantriEditForm
              key={s.id}
              santri={s}
              institusiId={institusiId}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <SantriCard
              key={s.id}
              santri={s}
              institusiId={institusiId}
              isAdmin={isAdmin}
              onEdit={() => setEditingId(s.id)}
            />
          )
        )}
      </div>
    </div>
  )
}

function SantriForm({
  institusiId,
  onDone,
}: {
  institusiId: number
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
        Tambah santri
      </h2>

      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null)
            const result = await createSantri(institusiId, fd)
            if (result?.error) setError(result.error)
            else onDone()
          })
        }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Nama lengkap
          </label>
          <input
            name="nama"
            required
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="Muhammad Fauzi"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Kelas
          </label>
          <input
            name="kelas"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="1 SMP / TK B / Aliyah 2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Halaqoh
          </label>
          <input
            name="halaqoh"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="Halaqoh A / Halaqoh Ust. Ahmad"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Tahun masuk
          </label>
          <input
            name="tahun_masuk"
            type="number"
            min="2000"
            max="2100"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            placeholder="2024"
          />
        </div>

        {error && (
          <div className="sm:col-span-2 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan santri'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SantriEditForm({
  santri,
  institusiId,
  onDone,
}: {
  santri: Santri
  institusiId: number
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-6">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
        Edit
      </div>
      <h2 className="font-display text-xl text-forest-800 mb-5">
        {santri.nama}
      </h2>

      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null)
            const result = await updateSantri(institusiId, santri.id, fd)
            if (result?.error) setError(result.error)
            else onDone()
          })
        }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Nama lengkap
          </label>
          <input
            name="nama"
            required
            defaultValue={santri.nama}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Kelas
          </label>
          <input
            name="kelas"
            defaultValue={santri.kelas ?? ''}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Halaqoh
          </label>
          <input
            name="halaqoh"
            defaultValue={santri.halaqoh ?? ''}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Tahun masuk
          </label>
          <input
            name="tahun_masuk"
            type="number"
            defaultValue={santri.tahun_masuk ?? ''}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>

        {error && (
          <div className="sm:col-span-2 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-ink-500 hover:text-ink-900"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}

function SantriCard({
  santri,
  institusiId,
  isAdmin,
  onEdit,
}: {
  santri: Santri
  institusiId: number
  isAdmin: boolean
  onEdit: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const details = [
    santri.kelas && { label: 'Kelas', value: santri.kelas },
    santri.halaqoh && { label: 'Halaqoh', value: santri.halaqoh },
    santri.tahun_masuk && {
      label: 'Masuk',
      value: String(santri.tahun_masuk),
    },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-forest-800 mb-2">{santri.nama}</h3>
          {details.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
              {details.map((d, i) => (
                <div key={i}>
                  <span className="text-ink-400">{d.label}: </span>
                  <span className="text-ink-700">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onEdit}
              className="text-xs text-forest-700 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Hapus santri ${santri.nama}?`)) {
                  startTransition(async () => {
                    await deleteSantri(institusiId, santri.id)
                  })
                }
              }}
              disabled={isPending}
              className="text-xs text-error-500 hover:underline disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  )
}