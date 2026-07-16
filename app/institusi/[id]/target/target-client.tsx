'use client'

// ============================================================
// FILE: app/institusi/[id]/target/target-client.tsx
// ============================================================

import { useState, useTransition, useMemo } from 'react'
import { createTarget, updateTargetStatus, deleteTarget } from './actions'

type Ustadz = {
  id: string
  nama: string
  peran: 'ustadz' | 'ustadzah'
}

type KategoriRef = {
  id: number
  nama: string
}

type Target = {
  id: string
  ustadzId: string
  ustadzNama: string
  kategoriId: number
  kategoriNama: string
  judul: string
  deskripsi: string | null
  unitType: 'setoran' | 'ayat' | 'halaman'
  targetValue: number
  targetMulai: string
  targetSelesai: string
  status: 'aktif' | 'selesai' | 'batal'
  progressValue: number
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

const unitLabel: Record<Target['unitType'], string> = {
  setoran: 'setoran',
  ayat: 'ayat',
  halaman: 'halaman',
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysBetween(from: string, to: string) {
  const d1 = new Date(from).getTime()
  const d2 = new Date(to).getTime()
  return Math.max(0, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)))
}

export default function TargetClient({
  institusi,
  institusiId,
  isAdmin,
  currentUserId,
  ustadzList,
  kategoriList,
  targets,
}: {
  institusi: Institusi
  institusiId: number
  isAdmin: boolean
  currentUserId: string
  ustadzList: Ustadz[]
  kategoriList: KategoriRef[]
  targets: Target[]
}) {
  const [activeStatus, setActiveStatus] = useState<
    'aktif' | 'selesai' | 'batal'
  >('aktif')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(
    () => targets.filter((t) => t.status === activeStatus),
    [targets, activeStatus]
  )

  const counts = useMemo(() => {
    const c = { aktif: 0, selesai: 0, batal: 0 }
    for (const t of targets) c[t.status]++
    return c
  }, [targets])

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
            {jenisLabel[institusi.jenis] ?? 'Kelola'}
          </div>
          <h1 className="font-display text-5xl text-forest-800 leading-none">
            Target
          </h1>
          <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
            {isAdmin
              ? 'Kelola target pengajaran ustadz per kategori. Progress dihitung otomatis dari setoran.'
              : 'Target pengajaran kamu. Progress otomatis dari setoran yang kamu input.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 bg-forest-700 hover:bg-forest-800 text-cream-50 text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            {showForm ? 'Batal' : '+ Target baru'}
          </button>
        )}
      </div>

      <div className="divider-double mb-6" />

      {showForm && isAdmin && (
        <TargetForm
          institusiId={institusiId}
          ustadzList={ustadzList}
          kategoriList={kategoriList}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Tab status */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-line">
        {(['aktif', 'selesai', 'batal'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition capitalize ${
              activeStatus === s
                ? 'border-forest-700 text-forest-800'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {s}
            <span className="ml-1.5 text-[10px] text-ink-400">
              ({counts[s]})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            {activeStatus === 'aktif'
              ? isAdmin
                ? 'Belum ada target aktif. Klik "+ Target baru" untuk mulai.'
                : 'Belum ada target aktif untukmu.'
              : `Tidak ada target ${activeStatus}.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((t) => (
            <TargetCard
              key={t.id}
              target={t}
              institusiId={institusiId}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TargetForm({
  institusiId,
  ustadzList,
  kategoriList,
  onDone,
}: {
  institusiId: number
  ustadzList: Ustadz[]
  kategoriList: KategoriRef[]
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const twoMonthsLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-6 mb-6">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
        Baru
      </div>
      <h2 className="font-display text-2xl text-forest-800 mb-5">
        Target pengajaran baru
      </h2>

      <form
        action={(fd) => {
          startTransition(async () => {
            setError(null)
            const result = await createTarget(institusiId, fd)
            if (result?.error) setError(result.error)
            else {
              onDone()
              setTimeout(() => window.location.reload(), 300)
            }
          })
        }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Ustadz / Ustadzah
          </label>
          <select
            name="ustadz_id"
            required
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="">— Pilih —</option>
            {ustadzList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama} ({u.peran})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Kategori
          </label>
          <select
            name="kategori_id"
            required
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="">— Pilih —</option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Judul target
          </label>
          <input
            name="judul"
            required
            placeholder="Misal: Al-Baqarah selesai, atau Fathul Qorib Bab Sholat"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Deskripsi materi (opsional)
          </label>
          <textarea
            name="deskripsi"
            rows={2}
            placeholder="Detail materi yang akan diajarkan..."
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Ukur progress berdasarkan
          </label>
          <select
            name="unit_type"
            defaultValue="setoran"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="setoran">Jumlah setoran</option>
            <option value="ayat">Jumlah ayat (Tahfiz)</option>
            <option value="halaman">Jumlah halaman (Kitab/Iqro)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Target angka
          </label>
          <input
            name="target_value"
            type="number"
            min="1"
            required
            placeholder="Misal: 286 (ayat), 30 (halaman), 20 (setoran)"
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Mulai
          </label>
          <input
            name="target_mulai"
            type="date"
            required
            defaultValue={today}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Selesai
          </label>
          <input
            name="target_selesai"
            type="date"
            required
            defaultValue={twoMonthsLater}
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
            {isPending ? 'Menyimpan...' : 'Simpan target'}
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

function TargetCard({
  target,
  institusiId,
  isAdmin,
  currentUserId,
}: {
  target: Target
  institusiId: number
  isAdmin: boolean
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const percent = target.targetValue > 0
    ? Math.min(100, Math.round((target.progressValue / target.targetValue) * 100))
    : 0

  const isOwnTarget = target.ustadzId === currentUserId
  const canModifyStatus = isAdmin || isOwnTarget

  const today = new Date().toISOString().slice(0, 10)
  const daysRemaining = daysBetween(today, target.targetSelesai)
  const isOverdue = today > target.targetSelesai && target.status === 'aktif'

  const barColor =
    target.status === 'selesai'
      ? 'bg-success-500'
      : target.status === 'batal'
      ? 'bg-ink-400'
      : percent >= 100
      ? 'bg-success-500'
      : percent >= 50
      ? 'bg-forest-700'
      : percent >= 25
      ? 'bg-copper-500'
      : 'bg-error-500/60'

  const doAction = (
    fn: () => Promise<{ error?: string; success?: boolean } | undefined>
  ) => {
    startTransition(async () => {
      setError(null)
      const result = await fn()
      if (result?.error) setError(result.error)
      else setTimeout(() => window.location.reload(), 300)
    })
  }

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-copper-600 bg-copper-500/10 border border-copper-500/30 rounded px-1.5 py-0.5">
              {target.kategoriNama}
            </span>
            <span className="text-[10px] text-ink-500">
              {target.ustadzNama}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-error-500 bg-error-500/10 border border-error-500/30 rounded px-1.5 py-0.5">
                Lewat deadline
              </span>
            )}
          </div>
          <h3 className="font-display text-xl text-forest-800 leading-tight">
            {target.judul}
          </h3>
          {target.deskripsi && (
            <p className="text-sm text-ink-500 mt-1">{target.deskripsi}</p>
          )}
        </div>

        {canModifyStatus && target.status === 'aktif' && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={() =>
                doAction(() =>
                  updateTargetStatus(institusiId, target.id, 'selesai')
                )
              }
              disabled={isPending}
              className="text-xs text-success-500 hover:underline disabled:opacity-50"
            >
              Tandai selesai
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() =>
                    doAction(() =>
                      updateTargetStatus(institusiId, target.id, 'batal')
                    )
                  }
                  disabled={isPending}
                  className="text-xs text-ink-500 hover:underline disabled:opacity-50"
                >
                  Batalkan
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Hapus target "${target.judul}"?`)) {
                      doAction(() => deleteTarget(institusiId, target.id))
                    }
                  }}
                  disabled={isPending}
                  className="text-xs text-error-500 hover:underline disabled:opacity-50"
                >
                  Hapus
                </button>
              </>
            )}
          </div>
        )}

        {isAdmin && target.status !== 'aktif' && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={() =>
                doAction(() =>
                  updateTargetStatus(institusiId, target.id, 'aktif')
                )
              }
              disabled={isPending}
              className="text-xs text-forest-700 hover:underline disabled:opacity-50"
            >
              Aktifkan lagi
            </button>
            <button
              onClick={() => {
                if (confirm(`Hapus target "${target.judul}"?`)) {
                  doAction(() => deleteTarget(institusiId, target.id))
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

      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-xs text-ink-700">
            <span className="font-medium text-forest-800">
              {target.progressValue}
            </span>
            <span className="text-ink-500">
              {' '}
              / {target.targetValue} {unitLabel[target.unitType]}
            </span>
          </div>
          <div className="text-xs font-medium text-forest-800">{percent}%</div>
        </div>
        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500 mt-3">
        <span>
          Periode: {formatTanggal(target.targetMulai)} →{' '}
          {formatTanggal(target.targetSelesai)}
        </span>
        {target.status === 'aktif' && !isOverdue && (
          <span>Sisa {daysRemaining} hari</span>
        )}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-error-50 border border-error-500/30 rounded-lg text-xs text-error-500">
          {error}
        </div>
      )}
    </div>
  )
}