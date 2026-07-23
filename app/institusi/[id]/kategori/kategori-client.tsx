'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  createKategori,
  deleteKategori,
  assignSantriKategori,
  unassignFromKategori,
  updateKategoriFields,
  type CustomField,
} from './actions'

type AssignmentItem = {
  assignmentId: string
  santriId: string
  santriNama: string
  santriKelas: string | null
}

type UstadzGroup = {
  ustadzId: string
  ustadzNama: string
  items: AssignmentItem[]
}

type Kategori = {
  id: number
  nama: string
  customFields: CustomField[]
  ustadzGroups: UstadzGroup[]
  totalSantri: number
  totalUstadz: number
}

type Institusi = {
  id: number
  nama: string
  jenis: string
}

type Ustadz = {
  id: string
  nama: string
  peran: 'ustadz' | 'ustadzah'
}

type Santri = {
  id: string
  nama: string
  kelas: string | null
}

const PRESETS = [
  'Bahasa',
  'Murojaah',
  'Public Speaking',
  'Iqro',
  'Hafalan Surah Pendek',
]

const jenisLabel: Record<string, string> = {
  RA: 'Raudhatul Athfal',
  TPQ: 'Taman Pendidikan Quran',
  PONPES: 'Pondok Pesantren',
}

export default function KategoriClient({
  institusi,
  institusiId,
  kategori,
  ustadzList,
  santriList,
}: {
  institusi: Institusi
  institusiId: number
  kategori: Kategori[]
  ustadzList: Ustadz[]
  santriList: Santri[]
}) {
  const [activeTab, setActiveTab] = useState<'tambah' | number>(
    kategori[0]?.id ?? 'tambah'
  )

  const activeKategori =
    typeof activeTab === 'number'
      ? kategori.find((k) => k.id === activeTab)
      : null

  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          {jenisLabel[institusi.jenis] ?? 'Kelola'}
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Kategori
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Kategori pembelajaran di {institusi.nama}. Kelola pengampu dan santri
          per kategori dari sini.
        </p>
      </div>

      <div className="divider-double mb-6" />

      <div className="flex flex-wrap gap-2 mb-8 border-b border-line">
        <button
          onClick={() => setActiveTab('tambah')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === 'tambah'
              ? 'border-copper-600 text-copper-600'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          + Tambah
        </button>
        {kategori.map((k) => (
          <button
            key={k.id}
            onClick={() => setActiveTab(k.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === k.id
                ? 'border-forest-700 text-forest-800'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {k.nama}
            <span className="ml-1.5 text-[10px] text-ink-400">
              ({k.totalSantri})
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'tambah' ? (
        <TambahKategoriPanel
          institusiId={institusiId}
          existingNames={kategori.map((k) => k.nama.toLowerCase())}
        />
      ) : activeKategori ? (
        <KategoriDetail
          kategori={activeKategori}
          institusiId={institusiId}
          ustadzList={ustadzList}
          santriList={santriList}
          onDeleted={() =>
            setActiveTab(
              kategori.find((k) => k.id !== activeKategori.id)?.id ?? 'tambah'
            )
          }
        />
      ) : null}
    </div>
  )
}

function TambahKategoriPanel({
  institusiId,
  existingNames,
}: {
  institusiId: number
  existingNames: string[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  const submit = (nama: string) => {
    startTransition(async () => {
      setError(null)
      setSuccess(null)
      const fd = new FormData()
      fd.append('nama', nama)
      const result = await createKategori(institusiId, fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(`Kategori "${nama}" berhasil ditambahkan`)
        setInputValue('')
        setTimeout(() => window.location.reload(), 600)
      }
    })
  }

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-6">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-1">
        Baru
      </div>
      <h2 className="font-display text-2xl text-forest-800 mb-5">
        Tambah kategori
      </h2>

      <div className="mb-6">
        <label className="block text-xs font-medium text-ink-700 mb-2">
          Preset cepat
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const alreadyExists = existingNames.includes(preset.toLowerCase())
            return (
              <button
                key={preset}
                onClick={() => submit(preset)}
                disabled={isPending || alreadyExists}
                className={`px-4 py-2 text-sm rounded-lg border transition ${
                  alreadyExists
                    ? 'bg-cream-100 border-line text-ink-400 cursor-not-allowed'
                    : 'bg-cream-100 hover:bg-forest-700 hover:text-cream-50 hover:border-forest-700 border-line text-ink-700'
                }`}
                title={alreadyExists ? 'Sudah ada' : `Tambah ${preset}`}
              >
                {preset}
                {alreadyExists && (
                  <span className="ml-1.5 text-[10px]">✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5">
          Atau nama custom
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                submit(inputValue.trim())
              }
            }}
            placeholder="Misal: Fiqih, Nahwu, Tajwid..."
            className="flex-1 px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
          <button
            onClick={() => inputValue.trim() && submit(inputValue.trim())}
            disabled={isPending || !inputValue.trim()}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-success-500/10 border border-success-500/30 rounded-lg text-sm text-success-500">
          ✓ {success}
        </div>
      )}
    </div>
  )
}

function KategoriDetail({
  kategori,
  institusiId,
  ustadzList,
  santriList,
  onDeleted,
}: {
  kategori: Kategori
  institusiId: number
  ustadzList: Ustadz[]
  santriList: Santri[]
  onDeleted: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    if (
      !confirm(
        `Hapus kategori "${kategori.nama}"? Semua penugasan di kategori ini harus dihapus dulu.`
      )
    )
      return

    startTransition(async () => {
      setError(null)
      const result = await deleteKategori(institusiId, kategori.id)
      if (result?.error) {
        setError(result.error)
      } else {
        onDeleted()
        setTimeout(() => window.location.reload(), 300)
      }
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-3xl text-forest-800">
            {kategori.nama}
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            {kategori.totalUstadz} pengampu · {kategori.totalSantri} santri
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-error-500 hover:underline disabled:opacity-50 shrink-0"
        >
          Hapus kategori
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
          {error}
        </div>
      )}

      {/* Panel: kelola field custom */}
      <CustomFieldsPanel
        institusiId={institusiId}
        kategoriId={kategori.id}
        initialFields={kategori.customFields}
      />

      {/* Form tambah penugasan baru */}
      <AssignForm
        institusiId={institusiId}
        kategoriId={kategori.id}
        ustadzList={ustadzList}
        santriList={santriList}
      />

      {kategori.ustadzGroups.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center mt-6">
          <p className="text-sm text-ink-500">
            Belum ada pengampu di kategori ini. Assign ustadz + santri di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {kategori.ustadzGroups.map((u) => (
            <UstadzCard
              key={u.ustadzId}
              group={u}
              institusiId={institusiId}
              kategoriId={kategori.id}
              ustadzList={ustadzList}
              santriList={santriList}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssignForm({
  institusiId,
  kategoriId,
  ustadzList,
  santriList,
}: {
  institusiId: number
  kategoriId: number
  ustadzList: Ustadz[]
  santriList: Santri[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ustadzId, setUstadzId] = useState('')
  const [santriId, setSantriId] = useState('')

  const submit = () => {
    if (!ustadzId || !santriId) {
      setError('Pilih ustadz dan santri dulu')
      return
    }
    startTransition(async () => {
      setError(null)
      const fd = new FormData()
      fd.append('ustadz_id', ustadzId)
      fd.append('santri_id', santriId)
      fd.append('kategori_id', String(kategoriId))
      const result = await assignSantriKategori(institusiId, fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setUstadzId('')
        setSantriId('')
        setTimeout(() => window.location.reload(), 300)
      }
    })
  }

  return (
    <div className="bg-cream-50 border border-forest-700/30 rounded-xl p-5">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-3">
        Tambah penugasan
      </div>
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Ustadz / Ustadzah
          </label>
          <select
            value={ustadzId}
            onChange={(e) => setUstadzId(e.target.value)}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="">— Pilih pengampu —</option>
            {ustadzList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama} ({u.peran})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Santri
          </label>
          <select
            value={santriId}
            onChange={(e) => setSantriId(e.target.value)}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="">— Pilih santri —</option>
            {santriList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
                {s.kelas ? ` · ${s.kelas}` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={isPending || !ustadzId || !santriId}
          className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition h-fit"
        >
          {isPending ? '...' : 'Tugaskan'}
        </button>
      </div>

      {ustadzList.length === 0 && (
        <div className="mt-3 text-xs text-ink-500">
          Belum ada ustadz/ustadzah di institusi ini. Tambah dulu di menu Super
          Admin.
        </div>
      )}
      {santriList.length === 0 && (
        <div className="mt-3 text-xs text-ink-500">
          Belum ada santri. Tambah dulu di menu Semua santri.
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
          {error}
        </div>
      )}
    </div>
  )
}

function UstadzCard({
  group,
  institusiId,
  kategoriId,
  ustadzList,
  santriList,
}: {
  group: UstadzGroup
  institusiId: number
  kategoriId: number
  ustadzList: Ustadz[]
  santriList: Santri[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [santriId, setSantriId] = useState('')

  const assignedSantriIds = new Set(group.items.map((i) => i.santriId))
  const availableSantri = santriList.filter((s) => !assignedSantriIds.has(s.id))

  const ustadzMeta = ustadzList.find((u) => u.id === group.ustadzId)

  const handleUnassign = (assignmentId: string, santriNama: string) => {
    if (!confirm(`Lepas ${santriNama} dari ${group.ustadzNama}?`)) return
    startTransition(async () => {
      setError(null)
      const result = await unassignFromKategori(institusiId, assignmentId)
      if (result?.error) {
        setError(result.error)
      } else {
        setTimeout(() => window.location.reload(), 300)
      }
    })
  }

  const handleAddSantri = () => {
    if (!santriId) return
    startTransition(async () => {
      setError(null)
      const fd = new FormData()
      fd.append('ustadz_id', group.ustadzId)
      fd.append('santri_id', santriId)
      fd.append('kategori_id', String(kategoriId))
      const result = await assignSantriKategori(institusiId, fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSantriId('')
        setShowAdd(false)
        setTimeout(() => window.location.reload(), 300)
      }
    })
  }

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-copper-600">
            {ustadzMeta?.peran === 'ustadzah' ? 'Ustadzah' : 'Ustadz'}
          </div>
          <div className="font-display text-xl text-forest-800">
            {group.ustadzNama}
          </div>
        </div>
        <div className="text-xs text-ink-500">{group.items.length} santri</div>
      </div>

      <div className="pt-3 border-t border-line/60">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-medium uppercase tracking-widest text-ink-500">
            Santri ampuan
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            disabled={availableSantri.length === 0}
            className="text-xs text-forest-700 hover:text-forest-800 disabled:opacity-40 disabled:hover:text-forest-700"
          >
            {showAdd ? 'Batal' : '+ Tugaskan santri'}
          </button>
        </div>

        {showAdd && availableSantri.length > 0 && (
          <div className="mb-3 flex gap-2">
            <select
              value={santriId}
              onChange={(e) => setSantriId(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            >
              <option value="">— Pilih santri —</option>
              {availableSantri.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                  {s.kelas ? ` · ${s.kelas}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddSantri}
              disabled={isPending || !santriId}
              className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-xs font-medium px-4 py-1.5 rounded-lg transition"
            >
              {isPending ? '...' : 'Tambah'}
            </button>
          </div>
        )}

        {group.items.length === 0 ? (
          <div className="text-xs text-ink-400 italic">Belum ada santri.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <div
                key={item.assignmentId}
                className="inline-flex items-center gap-1.5 bg-cream-100 border border-line rounded-md px-2.5 py-1"
              >
                <Link
                  href={`/institusi/${institusiId}/santri/${item.santriId}`}
                  className="text-sm text-ink-700 hover:text-forest-700 hover:underline underline-offset-4"
                >
                  {item.santriNama}
                  {item.santriKelas && (
                    <span className="text-ink-400 text-xs">
                      {' '}
                      · {item.santriKelas}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() =>
                    handleUnassign(item.assignmentId, item.santriNama)
                  }
                  disabled={isPending}
                  className="text-ink-400 hover:text-error-500 disabled:opacity-50 text-xs leading-none px-0.5"
                  title="Lepas assignment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 bg-error-50 border border-error-500/30 rounded-lg text-xs text-error-500">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CUSTOM FIELDS PANEL
// ============================================================

const typeLabel: Record<CustomField['type'], string> = {
  text: 'Teks',
  number: 'Angka',
  select: 'Pilihan',
}

function makeFieldKey() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function CustomFieldsPanel({
  institusiId,
  kategoriId,
  initialFields,
}: {
  institusiId: number
  kategoriId: number
  initialFields: CustomField[]
}) {
  const [fields, setFields] = useState<CustomField[]>(initialFields)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<CustomField['type']>('text')
  const [newOptions, setNewOptions] = useState('')

  const addField = () => {
    const label = newLabel.trim()
    if (!label) return
    if (fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      setError(`Field "${label}" sudah ada`)
      return
    }

    const field: CustomField = {
      key: makeFieldKey(),
      label,
      type: newType,
    }
    if (newType === 'select') {
      const opts = newOptions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (opts.length === 0) {
        setError('Field tipe Pilihan harus punya minimal 1 opsi')
        return
      }
      field.options = opts
    }

    setFields([...fields, field])
    setNewLabel('')
    setNewOptions('')
    setNewType('text')
    setIsDirty(true)
    setError(null)
  }

  const removeField = (key: string) => {
    setFields(fields.filter((f) => f.key !== key))
    setIsDirty(true)
  }

  const save = () => {
    startTransition(async () => {
      setError(null)
      setSuccess(false)
      const result = await updateKategoriFields(institusiId, kategoriId, fields)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setIsDirty(false)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <div className="bg-cream-50 border border-copper-600/30 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600">
            Field custom
          </div>
          <div className="text-xs text-ink-500 mt-0.5">
            Field yang ditampilkan waktu ustadz input setoran di kategori ini.
          </div>
        </div>
        {isDirty && (
          <button
            onClick={save}
            disabled={isPending}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-xs font-medium px-4 py-1.5 rounded-lg transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        )}
      </div>

      {fields.length > 0 && (
        <div className="space-y-2 mb-4">
          {fields.map((f) => (
            <div
              key={f.key}
              className="flex items-start justify-between gap-3 bg-cream-100 border border-line rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-forest-800">
                    {f.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-copper-600 bg-copper-500/10 border border-copper-500/30 rounded px-1.5 py-0.5">
                    {typeLabel[f.type]}
                  </span>
                </div>
                {f.type === 'select' && f.options && (
                  <div className="text-xs text-ink-500 mt-1">
                    Pilihan: {f.options.join(', ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeField(f.key)}
                className="text-xs text-error-500 hover:underline shrink-0"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && !isDirty && (
        <div className="text-xs text-ink-500 mb-4 italic">
          Belum ada field custom. Tambah di bawah.
        </div>
      )}

      <div className="border-t border-line/60 pt-4">
        <div className="text-[10px] font-medium uppercase tracking-widest text-ink-500 mb-2">
          Tambah field
        </div>
        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
          <div>
            <label className="block text-xs text-ink-700 mb-1">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Misal: Nama Kitab, Halaman Mulai, Kelancaran"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-700 mb-1">Tipe</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CustomField['type'])}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            >
              <option value="text">Teks</option>
              <option value="number">Angka</option>
              <option value="select">Pilihan</option>
            </select>
          </div>
          <button
            onClick={addField}
            disabled={!newLabel.trim()}
            className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-4 py-2 rounded-lg transition h-fit"
          >
            + Tambah
          </button>
        </div>

        {newType === 'select' && (
          <div className="mt-3">
            <label className="block text-xs text-ink-700 mb-1">
              Opsi pilihan (pisah pake koma)
            </label>
            <input
              type="text"
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="Mahir, Cukup, Kurang"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-error-50 border border-error-500/30 rounded-lg text-xs text-error-500">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 bg-success-500/10 border border-success-500/30 rounded-lg text-xs text-success-500">
          ✓ Field custom tersimpan
        </div>
      )}
    </div>
  )
}