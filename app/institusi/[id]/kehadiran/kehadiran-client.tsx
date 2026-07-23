'use client'

// ============================================================
// FILE: app/institusi/[id]/kehadiran/kehadiran-client.tsx
// ============================================================

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  setKehadiran,
  clearKehadiran,
  bulkSetHadir,
  type StatusKehadiran,
} from './actions'

type Santri = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  status: string | null
  keterangan: string | null
}

type Institusi = {
  id: number
  nama: string
  jenis: string
}

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

const statusOptions: {
  value: StatusKehadiran
  label: string
  colorClass: string
  activeClass: string
}[] = [
  {
    value: 'hadir',
    label: 'Hadir',
    colorClass:
      'bg-success-500/10 text-success-500 border-success-500/30 hover:bg-success-500/20',
    activeClass: 'bg-success-500 text-white border-success-500',
  },
  {
    value: 'izin',
    label: 'Izin',
    colorClass:
      'bg-copper-500/10 text-copper-600 border-copper-500/30 hover:bg-copper-500/20',
    activeClass: 'bg-copper-600 text-cream-50 border-copper-600',
  },
  {
    value: 'sakit',
    label: 'Sakit',
    colorClass:
      'bg-forest-700/10 text-forest-700 border-forest-700/30 hover:bg-forest-700/20',
    activeClass: 'bg-forest-700 text-cream-50 border-forest-700',
  },
  {
    value: 'alpha',
    label: 'Alpha',
    colorClass:
      'bg-error-500/10 text-error-500 border-error-500/30 hover:bg-error-500/20',
    activeClass: 'bg-error-500 text-white border-error-500',
  },
]

function formatTanggalPanjang(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function KehadiranClient({
  institusi,
  institusiId,
  currentTanggal,
  santriList,
}: {
  institusi: Institusi
  institusiId: number
  currentTanggal: string
  santriList: Santri[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const changeTanggal = (tanggal: string) => {
    const params = new URLSearchParams()
    if (tanggal) params.set('tanggal', tanggal)
    router.push(`/institusi/${institusiId}/kehadiran?${params.toString()}`)
  }

  const summary = useMemo(() => {
    const s = { hadir: 0, izin: 0, sakit: 0, alpha: 0, belum: 0 }
    for (const santri of santriList) {
      if (santri.status === 'hadir') s.hadir++
      else if (santri.status === 'izin') s.izin++
      else if (santri.status === 'sakit') s.sakit++
      else if (santri.status === 'alpha') s.alpha++
      else s.belum++
    }
    return s
  }, [santriList])

  const filtered = useMemo(() => {
    if (!search.trim()) return santriList
    const q = search.trim().toLowerCase()
    return santriList.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.kelas?.toLowerCase().includes(q) ||
        s.halaqoh?.toLowerCase().includes(q)
    )
  }, [santriList, search])

  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          {jenisLabel[institusi.jenis] ?? 'Kelola'}
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Kehadiran
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Catat kehadiran santri per hari. Klik status untuk set/ganti,
          klik yang aktif lagi buat batalin.
        </p>
      </div>

      <div className="divider-double mb-6" />

      {/* Pilih tanggal + summary */}
      <div className="bg-cream-50 border border-line rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Tanggal
            </label>
            <input
              type="date"
              value={currentTanggal}
              onChange={(e) => changeTanggal(e.target.value)}
              className="px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
            <div className="text-xs text-ink-500 mt-1">
              {formatTanggalPanjang(currentTanggal)}
            </div>
          </div>

          <BulkHadirButton
            institusiId={institusiId}
            tanggal={currentTanggal}
            santriList={santriList}
          />
        </div>

        {/* Summary counts */}
        <div className="grid grid-cols-5 gap-2 mt-5 pt-4 border-t border-line/60">
          <SummaryBox label="Hadir" count={summary.hadir} variant="success" />
          <SummaryBox label="Izin" count={summary.izin} variant="copper" />
          <SummaryBox label="Sakit" count={summary.sakit} variant="forest" />
          <SummaryBox label="Alpha" count={summary.alpha} variant="error" />
          <SummaryBox label="Belum" count={summary.belum} variant="muted" />
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari santri berdasarkan nama, kelas, atau halaqoh..."
          className="w-full px-3 py-2 bg-cream-50 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
        />
      </div>

      {/* List santri */}
      {filtered.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            {santriList.length === 0
              ? 'Belum ada santri di institusi ini.'
              : 'Gak ada santri yg cocok pencarian.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SantriRow
              key={s.id}
              santri={s}
              institusiId={institusiId}
              tanggal={currentTanggal}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryBox({
  label,
  count,
  variant,
}: {
  label: string
  count: number
  variant: 'success' | 'copper' | 'forest' | 'error' | 'muted'
}) {
  const colorClass = {
    success: 'text-success-500',
    copper: 'text-copper-600',
    forest: 'text-forest-700',
    error: 'text-error-500',
    muted: 'text-ink-400',
  }[variant]

  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">
        {label}
      </div>
      <div className={`font-display text-2xl ${colorClass}`}>{count}</div>
    </div>
  )
}

function BulkHadirButton({
  institusiId,
  tanggal,
  santriList,
}: {
  institusiId: number
  tanggal: string
  santriList: Santri[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const belumDiabsen = santriList.filter((s) => !s.status)

  if (belumDiabsen.length === 0) return null

  return (
    <div className="text-right">
      <button
        onClick={() => {
          if (
            !confirm(
              `Tandai ${belumDiabsen.length} santri yg belum diabsen sebagai Hadir?`
            )
          )
            return
          startTransition(async () => {
            setError(null)
            const result = await bulkSetHadir(
              institusiId,
              tanggal,
              belumDiabsen.map((s) => s.id)
            )
            if (result?.error) setError(result.error)
            else setTimeout(() => window.location.reload(), 300)
          })
        }}
        disabled={isPending}
        className="text-xs bg-success-500/10 text-success-500 hover:bg-success-500/20 border border-success-500/30 rounded-lg px-3 py-2 transition disabled:opacity-50"
      >
        {isPending
          ? 'Mencatat...'
          : `+ Tandai ${belumDiabsen.length} sisa jadi Hadir`}
      </button>
      {error && (
        <div className="text-[10px] text-error-500 mt-1">{error}</div>
      )}
    </div>
  )
}

function SantriRow({
  santri,
  institusiId,
  tanggal,
}: {
  santri: Santri
  institusiId: number
  tanggal: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [keterangan, setKeterangan] = useState(santri.keterangan ?? '')
  const [showKeterangan, setShowKeterangan] = useState(
    !!santri.keterangan && santri.keterangan.length > 0
  )

  const handleSetStatus = (status: StatusKehadiran) => {
    // Kalo klik status yg udah aktif, clear kehadiran
    if (santri.status === status) {
      startTransition(async () => {
        setError(null)
        const result = await clearKehadiran(institusiId, santri.id, tanggal)
        if (result?.error) setError(result.error)
        else setTimeout(() => window.location.reload(), 300)
      })
      return
    }

    startTransition(async () => {
      setError(null)
      const result = await setKehadiran(
        institusiId,
        santri.id,
        tanggal,
        status,
        keterangan.trim() || null
      )
      if (result?.error) setError(result.error)
      else setTimeout(() => window.location.reload(), 300)
    })
  }

  const saveKeterangan = () => {
    if (!santri.status) return
    startTransition(async () => {
      setError(null)
      const result = await setKehadiran(
        institusiId,
        santri.id,
        tanggal,
        santri.status as StatusKehadiran,
        keterangan.trim() || null
      )
      if (result?.error) setError(result.error)
      else setTimeout(() => window.location.reload(), 300)
    })
  }

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-forest-800">
            {santri.nama}
          </div>
          <div className="text-xs text-ink-500 flex flex-wrap gap-x-3">
            {santri.kelas && <span>Kelas {santri.kelas}</span>}
            {santri.halaqoh && <span>Halaqoh {santri.halaqoh}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 shrink-0">
          {statusOptions.map((opt) => {
            const isActive = santri.status === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => handleSetStatus(opt.value)}
                disabled={isPending}
                className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition disabled:opacity-50 ${
                  isActive ? opt.activeClass : opt.colorClass
                }`}
              >
                {opt.label}
              </button>
            )
          })}
          {santri.status && (
            <button
              onClick={() => setShowKeterangan((v) => !v)}
              disabled={isPending}
              className="px-2 py-1.5 text-xs text-ink-500 hover:text-ink-900 border border-line rounded-lg transition disabled:opacity-50"
              title="Tambah keterangan"
            >
              📝
            </button>
          )}
        </div>
      </div>

      {(showKeterangan || santri.keterangan) && santri.status && (
        <div className="mt-3 pt-3 border-t border-line/60 flex gap-2">
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Keterangan (opsional): alasan izin, jenis sakit, dll"
            className="flex-1 px-3 py-1.5 bg-cream-100 border border-line rounded-lg text-xs focus:outline-none focus:border-forest-700"
          />
          <button
            onClick={saveKeterangan}
            disabled={isPending}
            className="text-xs bg-forest-700 text-cream-50 hover:bg-forest-800 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      )}

      {santri.keterangan && !showKeterangan && (
        <div className="mt-2 text-xs text-ink-500 italic">
          &ldquo;{santri.keterangan}&rdquo;
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-error-50 border border-error-500/30 rounded-lg text-xs text-error-500">
          {error}
        </div>
      )}
    </div>
  )
}