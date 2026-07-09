'use client'

import { useState, useTransition } from 'react'
import { updateSantri, deleteSantri } from './santri/actions'

type Institusi = { nama: string; jenis: string }
type Stat = { label: string; value: number | string; suffix?: string }
type SantriRow = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  tahun_masuk: number | null
  assignmentCount: number
  todayProgresCount: number
}

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

export default function AdminOverviewClient({
  institusi,
  stats,
  santriList,
  institusiId,
}: {
  institusi: Institusi
  stats: Stat[]
  santriList: SantriRow[]
  institusiId: number
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          {jenisLabel[institusi.jenis] ?? institusi.jenis} · Ringkasan
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          {institusi.nama}
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Kelola santri, kategori pembelajaran, dan pengajar institusi ini dari
          panel di samping.
        </p>
      </div>

      <div className="divider-double mb-8" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-cream-50 border border-line rounded-xl p-4"
          >
            <div className="text-[10px] text-ink-500 mb-1 uppercase tracking-wider">
              {s.label}
            </div>
            <div className="font-display text-2xl text-forest-800">
              {s.value}
              {s.suffix && (
                <span className="text-lg text-ink-500 ml-0.5">{s.suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-6">
          <h2 className="font-display text-2xl text-forest-800 mb-1">
            Santri terdaftar
          </h2>
          <p className="text-sm text-ink-500">
            Klik nama untuk edit atau hapus. Badge menunjukkan status setoran
            hari ini.
          </p>
        </div>

        {santriList.length === 0 ? (
          <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
            <p className="text-sm text-ink-500">
              Belum ada santri terdaftar. Tambah dari menu{' '}
              <span className="text-forest-700 font-medium">Semua santri</span>{' '}
              di samping.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {santriList.map((s) =>
              editingId === s.id ? (
                <SantriEditRow
                  key={s.id}
                  santri={s}
                  institusiId={institusiId}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <SantriListRow
                  key={s.id}
                  santri={s}
                  onEdit={() => setEditingId(s.id)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getStatus(santri: SantriRow) {
  if (santri.assignmentCount === 0) {
    return {
      label: 'Belum ada tugas',
      className: 'text-ink-500 bg-cream-100 border-line',
    }
  }
  if (santri.todayProgresCount === 0) {
    return {
      label: 'Belum setor',
      className: 'text-copper-600 bg-copper-500/10 border-copper-500/30',
    }
  }
  if (santri.todayProgresCount >= santri.assignmentCount) {
    return {
      label: 'Semua setor',
      className: 'text-success-500 bg-success-500/10 border-success-500/30',
    }
  }
  return {
    label: `${santri.todayProgresCount}/${santri.assignmentCount} setor`,
    className: 'text-copper-600 bg-copper-500/10 border-copper-500/30',
  }
}

function SantriListRow({
  santri,
  onEdit,
}: {
  santri: SantriRow
  onEdit: () => void
}) {
  const status = getStatus(santri)
  const details = [
    santri.kelas,
    santri.halaqoh && `Halaqoh ${santri.halaqoh}`,
    santri.tahun_masuk && `Masuk ${santri.tahun_masuk}`,
  ].filter(Boolean) as string[]

  return (
    <button
      onClick={onEdit}
      className="w-full group flex items-center justify-between gap-4 bg-cream-50 border border-line rounded-lg p-4 hover:border-forest-700 transition text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-forest-800 group-hover:text-forest-600 transition">
          {santri.nama}
        </div>
        {details.length > 0 && (
          <div className="text-xs text-ink-500 mt-0.5">
            {details.join(' · ')}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <span
          className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border ${status.className}`}
        >
          {status.label}
        </span>
      </div>
    </button>
  )
}

function SantriEditRow({
  santri,
  institusiId,
  onDone,
}: {
  santri: SantriRow
  institusiId: number
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-5">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-3">
        Edit santri
      </div>
      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null)
            const result = await updateSantri(institusiId, santri.id, fd)
            if (result?.error) setError(result.error)
            else onDone()
          })
        }}
        className="grid sm:grid-cols-2 gap-3"
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

        <div className="sm:col-span-2 flex items-center justify-between mt-2 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="text-sm text-ink-500 hover:text-ink-900"
            >
              Batal
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Hapus santri ${santri.nama}?`)) {
                startTransition(async () => {
                  await deleteSantri(institusiId, santri.id)
                  onDone()
                })
              }
            }}
            disabled={isPending}
            className="text-xs text-error-500 hover:underline disabled:opacity-50"
          >
            Hapus santri
          </button>
        </div>
      </form>
    </div>
  )
}