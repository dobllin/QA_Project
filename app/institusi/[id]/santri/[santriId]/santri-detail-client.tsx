'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  createProgres,
  deleteProgres,
  updateProgres,
  addPoinLog,
  deletePoinLog,
} from './actions'

type Santri = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  tahun_masuk: number | null
  poin: number | null
}

type Kategori = {
  id: number
  nama: string
  ustadzNames: string[]
}

type Progres = {
  id: string
  tanggal: string
  kategori_id: number
  ustadz_id: string
  jenis_setoran: string | null
  lancar: boolean | null
  surah_mulai: string | null
  ayat_mulai: number | null
  surah_selesai: string | null
  ayat_selesai: number | null
  kitab_nama: string | null
  bab: string | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  absen: boolean | null
  kendala: string | null
  tersampaikan: boolean | null
  iqro_jilid: number | null
  iqro_halaman: number | null
  kualitas: string | null
  catatan: string | null
  profiles: { nama: string } | null
}

type PoinLogEntry = {
  id: string
  jenis: 'kesalahan_ringan' | 'kesalahan_sedang' | 'kesalahan_parah' | 'kebaikan'
  nilai_perubahan: number
  keterangan: string | null
  tanggal: string
  ustadz_id: string
  profiles: { nama: string } | null
}

type ProgresType = 'tahfiz' | 'kitab' | 'iqro' | 'other'

function getProgresType(kategoriNama: string): ProgresType {
  const lower = kategoriNama.toLowerCase()
  if (lower.includes('kitab')) return 'kitab'
  if (lower.includes('iqro') || lower.includes('iqra')) return 'iqro'
  if (
    lower.includes('tahfiz') ||
    lower.includes('hafalan') ||
    lower.includes('quran') ||
    lower.includes('surat') ||
    lower.includes('murojaah')
  )
    return 'tahfiz'
  return 'other'
}

const today = () => new Date().toISOString().split('T')[0]

const formatTanggal = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const nilaiOptions = [
  { value: 'kurang', label: 'Kurang' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sangat_bagus', label: 'Sangat bagus' },
]

const jenisSetoranOptions = [
  { value: 'hafalan_baru', label: 'Hafalan baru' },
  { value: 'setoran', label: 'Setoran' },
  { value: 'murojaah', label: 'Murojaah' },
]

const kualitasLabel: Record<string, string> = {
  lancar: 'Lancar',
  cukup: 'Cukup',
  ulang: 'Perlu diulang',
  kurang: 'Kurang',
  sedang: 'Sedang',
  sangat_bagus: 'Sangat bagus',
}

const jenisSetoranLabel: Record<string, string> = {
  hafalan_baru: 'Hafalan baru',
  setoran: 'Setoran',
  murojaah: 'Murojaah',
}

const poinJenisLabel: Record<string, string> = {
  kebaikan: 'Kebaikan',
  kesalahan_ringan: 'Kesalahan ringan',
  kesalahan_sedang: 'Kesalahan sedang',
  kesalahan_parah: 'Kesalahan parah',
}

function getNilaiVariant(
  kualitas: string | null
): 'success' | 'copper' | 'error' | 'muted' {
  if (!kualitas) return 'muted'
  if (kualitas === 'lancar' || kualitas === 'sangat_bagus') return 'success'
  if (kualitas === 'cukup' || kualitas === 'sedang') return 'copper'
  if (kualitas === 'ulang' || kualitas === 'kurang') return 'error'
  return 'muted'
}

export default function SantriDetailClient({
  santri,
  kategoriList,
  progressHistory,
  poinLog,
  institusiId,
  isAdmin,
  isPondok,
}: {
  santri: Santri
  kategoriList: Kategori[]
  progressHistory: Progres[]
  poinLog: PoinLogEntry[]
  institusiId: number
  isAdmin: boolean
  isPondok: boolean
}) {
  const [activeKategoriId, setActiveKategoriId] = useState<number>(
    kategoriList[0]?.id ?? 0
  )
  const [showForm, setShowForm] = useState(true)

  const activeKategori = kategoriList.find((k) => k.id === activeKategoriId)
  const filteredHistory = progressHistory.filter(
    (p) => p.kategori_id === activeKategoriId
  )

  const details = [
    santri.kelas && { label: 'Kelas', value: santri.kelas },
    santri.halaqoh && { label: 'Halaqoh', value: santri.halaqoh },
    santri.tahun_masuk && { label: 'Masuk', value: String(santri.tahun_masuk) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div>
      <Link
        href={`/institusi/${institusiId}/santri`}
        className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900 mb-6"
      >
        ← Kembali ke daftar santri
      </Link>

      <div className="mb-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Santri
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          {santri.nama}
        </h1>
        {details.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-ink-500">
            {details.map((d, i) => (
              <div key={i}>
                <span className="text-ink-400">{d.label}: </span>
                <span className="text-ink-700">{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="divider-double mb-8" />

      {(isPondok || isAdmin) && (
        <>
          <PoinSection
            santriId={santri.id}
            poin={santri.poin ?? 100}
            poinLog={poinLog}
            institusiId={institusiId}
          />
          <div className="divider-double mb-8 mt-8" />
        </>
      )}

      {kategoriList.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Kamu belum mengampu santri ini di kategori manapun.
          </p>
        </div>
      ) : (
        <>
          {kategoriList.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6 border-b border-line">
              {kategoriList.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setActiveKategoriId(k.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                    activeKategoriId === k.id
                      ? 'border-forest-700 text-forest-800'
                      : 'border-transparent text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {k.nama}
                </button>
              ))}
            </div>
          )}

          {activeKategori && (
            <>
              {activeKategori.ustadzNames.length > 0 && isAdmin && (
                <div className="mb-4 text-xs text-ink-500">
                  Pengampu:{' '}
                  <span className="text-forest-800">
                    {activeKategori.ustadzNames.join(', ')}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-2xl text-forest-800">
                    Setoran baru
                  </h2>
                  <button
                    onClick={() => setShowForm((v) => !v)}
                    className="text-xs text-ink-500 hover:text-ink-900"
                  >
                    {showForm ? 'Sembunyikan' : 'Tampilkan form'}
                  </button>
                </div>
                {showForm && (
                  <ProgresForm
                    santriId={santri.id}
                    kategoriId={activeKategori.id}
                    kategoriNama={activeKategori.nama}
                    institusiId={institusiId}
                    isAdmin={isAdmin}
                  />
                )}
              </div>

              <div>
                <h2 className="font-display text-2xl text-forest-800 mb-4">
                  Riwayat setoran ({filteredHistory.length})
                </h2>
                {filteredHistory.length === 0 ? (
                  <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
                    <p className="text-sm text-ink-500">
                      Belum ada setoran tercatat untuk kategori ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistory.map((p) => (
                      <ProgresCard
                        key={p.id}
                        progres={p}
                        progresType={
                          isAdmin ? 'tahfiz' : getProgresType(activeKategori.nama)
                        }
                        institusiId={institusiId}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function PoinSection({
  santriId,
  poin,
  poinLog,
  institusiId,
}: {
  santriId: string
  poin: number
  poinLog: PoinLogEntry[]
  institusiId: number
}) {
  const [isPending, startTransition] = useTransition()
  const [keterangan, setKeterangan] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const handleAddPoin = (
    jenis: 'kesalahan_ringan' | 'kesalahan_sedang' | 'kesalahan_parah' | 'kebaikan'
  ) => {
    startTransition(async () => {
      setError(null)
      const result = await addPoinLog(
        institusiId,
        santriId,
        jenis,
        keterangan.trim() || null
      )
      if (result?.error) setError(result.error)
      else setKeterangan('')
    })
  }

  const poinColor =
    poin >= 100
      ? 'text-success-500'
      : poin >= 80
      ? 'text-forest-800'
      : poin >= 50
      ? 'text-copper-600'
      : 'text-error-500'

  const displayed = showAll ? poinLog : poinLog.slice(0, 3)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="font-display text-2xl text-forest-800">Poin santri</h2>
        <div className="flex items-baseline gap-2">
          <div className="text-xs text-ink-500">Poin saat ini</div>
          <div className={`font-display text-4xl ${poinColor}`}>{poin}</div>
        </div>
      </div>

      <div className="bg-cream-50 border border-line rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Keterangan (opsional)
          </label>
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Misal: terlambat ke halaqoh, membantu teman..."
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-2">
            Catat aksi
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleAddPoin('kebaikan')}
              disabled={isPending}
              className="bg-success-500/10 hover:bg-success-500/20 disabled:opacity-50 text-success-500 border border-success-500/30 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              Kebaikan
              <div className="text-[10px] font-normal opacity-70">+5</div>
            </button>
            <button
              type="button"
              onClick={() => handleAddPoin('kesalahan_ringan')}
              disabled={isPending}
              className="bg-copper-500/10 hover:bg-copper-500/20 disabled:opacity-50 text-copper-600 border border-copper-500/30 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              Ringan
              <div className="text-[10px] font-normal opacity-70">−1</div>
            </button>
            <button
              type="button"
              onClick={() => handleAddPoin('kesalahan_sedang')}
              disabled={isPending}
              className="bg-copper-500/20 hover:bg-copper-500/30 disabled:opacity-50 text-copper-600 border border-copper-500/40 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              Sedang
              <div className="text-[10px] font-normal opacity-70">−5</div>
            </button>
            <button
              type="button"
              onClick={() => handleAddPoin('kesalahan_parah')}
              disabled={isPending}
              className="bg-error-500/10 hover:bg-error-500/20 disabled:opacity-50 text-error-500 border border-error-500/30 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              Parah
              <div className="text-[10px] font-normal opacity-70">−10</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
            {error}
          </div>
        )}

        {poinLog.length > 0 && (
          <div className="pt-4 border-t border-line/60">
            <div className="text-[10px] font-medium uppercase tracking-widest text-ink-500 mb-3">
              Riwayat perubahan poin
            </div>
            <div className="space-y-2">
              {displayed.map((log) => (
                <PoinLogRow
                  key={log.id}
                  log={log}
                  institusiId={institusiId}
                />
              ))}
            </div>
            {poinLog.length > 3 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 text-xs text-forest-700 hover:text-forest-800 underline underline-offset-4"
              >
                {showAll
                  ? 'Tampilkan sedikit'
                  : `Tampilkan semua (${poinLog.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PoinLogRow({
  log,
  institusiId,
}: {
  log: PoinLogEntry
  institusiId: number
}) {
  const [isPending, startTransition] = useTransition()
  const isPositif = log.nilai_perubahan > 0

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-display text-base ${
              isPositif ? 'text-success-500' : 'text-error-500'
            }`}
          >
            {isPositif ? '+' : ''}
            {log.nilai_perubahan}
          </span>
          <span className="text-xs text-ink-700">
            {poinJenisLabel[log.jenis]}
          </span>
        </div>
        {log.keterangan && (
          <div className="text-xs text-ink-500 italic mt-0.5">
            {log.keterangan}
          </div>
        )}
        <div className="text-[10px] text-ink-400 mt-0.5">
          {formatTanggal(log.tanggal)}
          {log.profiles?.nama && ` · ${log.profiles.nama}`}
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm('Batalkan aksi ini?')) {
            startTransition(async () => {
              await deletePoinLog(institusiId, log.id)
            })
          }
        }}
        disabled={isPending}
        className="text-[10px] text-error-500 hover:underline disabled:opacity-50"
      >
        Batal
      </button>
    </div>
  )
}

function ProgresForm({
  santriId,
  kategoriId,
  kategoriNama,
  institusiId,
  isAdmin,
}: {
  santriId: string
  kategoriId: number
  kategoriNama: string
  institusiId: number
  isAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const progresType: ProgresType = isAdmin ? 'tahfiz' : getProgresType(kategoriNama)

  return (
    <form
      key={formKey}
      action={(fd) => {
        startTransition(async () => {
          setError(null)
          setSuccess(false)
          fd.append('kategori_id', String(kategoriId))
          const result = await createProgres(institusiId, santriId, fd)
          if (result?.error) setError(result.error)
          else {
            setSuccess(true)
            setFormKey((k) => k + 1)
            setTimeout(() => setSuccess(false), 3000)
          }
        })
      }}
      className="bg-cream-50 border border-forest-700/30 rounded-xl p-6 space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Tanggal
          </label>
          <input
            name="tanggal"
            type="date"
            required
            defaultValue={today()}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        {progresType === 'tahfiz' && (
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Jenis kegiatan
            </label>
            <select
              name="jenis_setoran"
              defaultValue="hafalan_baru"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            >
              {jenisSetoranOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {progresType === 'tahfiz' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Surah mulai
            </label>
            <input
              name="surah_mulai"
              placeholder="Al-Baqarah"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Ayat mulai
            </label>
            <input
              name="ayat_mulai"
              type="number"
              min="1"
              placeholder="255"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Surah selesai
            </label>
            <input
              name="surah_selesai"
              placeholder="Al-Baqarah"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Ayat selesai
            </label>
            <input
              name="ayat_selesai"
              type="number"
              min="1"
              placeholder="286"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
        </div>
      )}

      {progresType === 'kitab' && (
        <>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-2">
              Absen
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'true', label: 'Hadir' },
                { value: 'false', label: 'Tidak hadir' },
              ].map((k) => (
                <label key={k.value} className="cursor-pointer inline-flex">
                  <input
                    type="radio"
                    name="absen"
                    value={k.value === 'true' ? 'false' : 'true'}
                    className="peer sr-only"
                    defaultChecked={k.value === 'true'}
                  />
                  <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                    {k.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Nama kitab
              </label>
              <input
                name="kitab_nama"
                placeholder="Fathul Qorib"
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Bab
              </label>
              <input
                name="bab"
                placeholder="Bab shalat jamaah"
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Halaman mulai
              </label>
              <input
                name="halaman_mulai"
                type="number"
                min="1"
                placeholder="24"
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Halaman selesai
              </label>
              <input
                name="halaman_selesai"
                type="number"
                min="1"
                placeholder="31"
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Kendala
            </label>
            <textarea
              name="kendala"
              rows={2}
              placeholder="Kendala yang dihadapi santri..."
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-2">
              Materi tersampaikan?
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'true', label: 'Ya, tersampaikan' },
                { value: 'false', label: 'Tidak' },
              ].map((k) => (
                <label key={k.value} className="cursor-pointer inline-flex">
                  <input
                    type="radio"
                    name="tersampaikan"
                    value={k.value}
                    className="peer sr-only"
                    defaultChecked={k.value === 'true'}
                  />
                  <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                    {k.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {progresType === 'iqro' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Jilid
            </label>
            <input
              name="iqro_jilid"
              type="number"
              min="1"
              max="6"
              placeholder="3"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Halaman
            </label>
            <input
              name="iqro_halaman"
              type="number"
              min="1"
              placeholder="12"
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
        </div>
      )}

      {progresType !== 'kitab' && (
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-2">
            Kelancaran
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'true', label: 'Lancar' },
              { value: 'false', label: 'Tidak lancar' },
            ].map((k) => (
              <label key={k.value} className="cursor-pointer inline-flex">
                <input
                  type="radio"
                  name="lancar"
                  value={k.value}
                  className="peer sr-only"
                  defaultChecked={k.value === 'true'}
                />
                <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                  {k.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-2">
          Nilai
        </label>
        <div className="flex flex-wrap gap-2">
          {nilaiOptions.map((k) => (
            <label key={k.value} className="cursor-pointer inline-flex">
              <input
                type="radio"
                name="kualitas"
                value={k.value}
                className="peer sr-only"
                defaultChecked={k.value === 'sedang'}
              />
              <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                {k.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5">
          Catatan / Keterangan (opsional)
        </label>
        <textarea
          name="catatan"
          rows={2}
          placeholder="..."
          className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 resize-none"
        />
      </div>

      {error && (
        <div className="p-3 bg-error-50 border border-error-500/30 rounded-lg text-sm text-error-500">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-success-500/10 border border-success-500/30 rounded-lg text-sm text-success-500">
          ✓ Setoran tersimpan
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {isPending ? 'Menyimpan...' : 'Simpan setoran'}
        </button>
      </div>
    </form>
  )
}

function ProgresCard({
  progres,
  progresType,
  institusiId,
  isAdmin,
}: {
  progres: Progres
  progresType: ProgresType
  institusiId: number
  isAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isEditing) {
    return (
      <ProgresEditForm
        progres={progres}
        progresType={progresType}
        institusiId={institusiId}
        onCancel={() => {
          setIsEditing(false)
          setError(null)
        }}
        onSuccess={() => {
          setIsEditing(false)
          setError(null)
        }}
        onError={(msg) => setError(msg)}
      />
    )
  }

  const summary: string[] = []
  if (progresType === 'tahfiz') {
    if (progres.jenis_setoran) {
      summary.push(
        jenisSetoranLabel[progres.jenis_setoran] ?? progres.jenis_setoran
      )
    }
    if (progres.surah_mulai || progres.surah_selesai) {
      const mulai = [progres.surah_mulai, progres.ayat_mulai]
        .filter(Boolean)
        .join(' : ')
      const selesai = [progres.surah_selesai, progres.ayat_selesai]
        .filter(Boolean)
        .join(' : ')
      summary.push(`${mulai || '?'} → ${selesai || '?'}`)
    }
  } else if (progresType === 'kitab') {
    if (progres.kitab_nama) summary.push(progres.kitab_nama)
    if (progres.bab) summary.push(progres.bab)
    if (progres.halaman_mulai || progres.halaman_selesai) {
      summary.push(
        `Hal ${progres.halaman_mulai ?? '?'}–${progres.halaman_selesai ?? '?'}`
      )
    }
  } else if (progresType === 'iqro') {
    if (progres.iqro_jilid) summary.push(`Jilid ${progres.iqro_jilid}`)
    if (progres.iqro_halaman) summary.push(`Hal ${progres.iqro_halaman}`)
  }

  const nilaiVariant = getNilaiVariant(progres.kualitas)
  const nilaiClass =
    nilaiVariant === 'success'
      ? 'bg-success-500/10 text-success-500 border-success-500/30'
      : nilaiVariant === 'error'
      ? 'bg-error-500/10 text-error-500 border-error-500/30'
      : nilaiVariant === 'copper'
      ? 'bg-copper-500/10 text-copper-600 border-copper-500/30'
      : 'bg-cream-100 text-ink-500 border-line'

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="text-sm font-medium text-forest-800">
              {formatTanggal(progres.tanggal)}
            </div>
            {progres.kualitas && (
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${nilaiClass}`}
              >
                {kualitasLabel[progres.kualitas] ?? progres.kualitas}
              </span>
            )}
            {progresType !== 'kitab' && progres.lancar !== null && (
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                  progres.lancar
                    ? 'bg-success-500/10 text-success-500 border-success-500/30'
                    : 'bg-error-500/10 text-error-500 border-error-500/30'
                }`}
              >
                {progres.lancar ? 'Lancar' : 'Tidak lancar'}
              </span>
            )}
            {progresType === 'kitab' && progres.absen !== null && (
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                  progres.absen === false
                    ? 'bg-success-500/10 text-success-500 border-success-500/30'
                    : 'bg-error-500/10 text-error-500 border-error-500/30'
                }`}
              >
                {progres.absen === false ? 'Hadir' : 'Tidak hadir'}
              </span>
            )}
            {progresType === 'kitab' && progres.tersampaikan !== null && (
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                  progres.tersampaikan
                    ? 'bg-success-500/10 text-success-500 border-success-500/30'
                    : 'bg-copper-500/10 text-copper-600 border-copper-500/30'
                }`}
              >
                {progres.tersampaikan ? 'Tersampaikan' : 'Belum sampai'}
              </span>
            )}
          </div>
          {summary.length > 0 && (
            <div className="text-sm text-ink-700 mb-1">
              {summary.join(' · ')}
            </div>
          )}
          {progres.kendala && (
            <div className="text-sm text-ink-500 mt-2">
              <span className="text-ink-400 text-xs">Kendala: </span>
              {progres.kendala}
            </div>
          )}
          {progres.catatan && (
            <div className="text-sm text-ink-500 italic mt-2">
              {progres.catatan}
            </div>
          )}
          {isAdmin && progres.profiles?.nama && (
            <div className="text-xs text-ink-400 mt-2">
              Diinput oleh {progres.profiles.nama}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-forest-700 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Hapus setoran ini?')) {
                startTransition(async () => {
                  await deleteProgres(institusiId, progres.id)
                })
              }
            }}
            disabled={isPending}
            className="text-xs text-error-500 hover:underline disabled:opacity-50"
          >
            Hapus
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 p-2 bg-error-50 border border-error-500/30 rounded-lg text-xs text-error-500">
          {error}
        </div>
      )}
    </div>
  )
}

function ProgresEditForm({
  progres,
  progresType,
  institusiId,
  onCancel,
  onSuccess,
  onError,
}: {
  progres: Progres
  progresType: ProgresType
  institusiId: number
  onCancel: () => void
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          const result = await updateProgres(institusiId, progres.id, fd)
          if (result?.error) onError(result.error)
          else onSuccess()
        })
      }}
      className="bg-cream-50 border border-forest-700/50 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600">
          Edit setoran
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ink-500 hover:text-ink-900"
        >
          Batal
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">
            Tanggal
          </label>
          <input
            name="tanggal"
            type="date"
            required
            defaultValue={progres.tanggal.split('T')[0]}
            className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
          />
        </div>
        {progresType === 'tahfiz' && (
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Jenis kegiatan
            </label>
            <select
              name="jenis_setoran"
              defaultValue={progres.jenis_setoran ?? 'hafalan_baru'}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            >
              {jenisSetoranOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {progresType === 'tahfiz' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Surah mulai
            </label>
            <input
              name="surah_mulai"
              defaultValue={progres.surah_mulai ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Ayat mulai
            </label>
            <input
              name="ayat_mulai"
              type="number"
              min="1"
              defaultValue={progres.ayat_mulai ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Surah selesai
            </label>
            <input
              name="surah_selesai"
              defaultValue={progres.surah_selesai ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Ayat selesai
            </label>
            <input
              name="ayat_selesai"
              type="number"
              min="1"
              defaultValue={progres.ayat_selesai ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
        </div>
      )}

      {progresType === 'kitab' && (
        <>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-2">
              Absen
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'false', label: 'Hadir' },
                { value: 'true', label: 'Tidak hadir' },
              ].map((k) => (
                <label key={k.value} className="cursor-pointer inline-flex">
                  <input
                    type="radio"
                    name="absen"
                    value={k.value}
                    className="peer sr-only"
                    defaultChecked={
                      progres.absen === null
                        ? k.value === 'false'
                        : String(progres.absen) === k.value
                    }
                  />
                  <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                    {k.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Nama kitab
              </label>
              <input
                name="kitab_nama"
                defaultValue={progres.kitab_nama ?? ''}
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Bab
              </label>
              <input
                name="bab"
                defaultValue={progres.bab ?? ''}
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Halaman mulai
              </label>
              <input
                name="halaman_mulai"
                type="number"
                min="1"
                defaultValue={progres.halaman_mulai ?? ''}
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">
                Halaman selesai
              </label>
              <input
                name="halaman_selesai"
                type="number"
                min="1"
                defaultValue={progres.halaman_selesai ?? ''}
                className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Kendala
            </label>
            <textarea
              name="kendala"
              rows={2}
              defaultValue={progres.kendala ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-2">
              Materi tersampaikan?
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'true', label: 'Ya, tersampaikan' },
                { value: 'false', label: 'Tidak' },
              ].map((k) => (
                <label key={k.value} className="cursor-pointer inline-flex">
                  <input
                    type="radio"
                    name="tersampaikan"
                    value={k.value}
                    className="peer sr-only"
                    defaultChecked={
                      progres.tersampaikan === null
                        ? k.value === 'true'
                        : String(progres.tersampaikan) === k.value
                    }
                  />
                  <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                    {k.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {progresType === 'iqro' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Jilid
            </label>
            <input
              name="iqro_jilid"
              type="number"
              min="1"
              max="6"
              defaultValue={progres.iqro_jilid ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Halaman
            </label>
            <input
              name="iqro_halaman"
              type="number"
              min="1"
              defaultValue={progres.iqro_halaman ?? ''}
              className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
        </div>
      )}

      {progresType !== 'kitab' && (
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-2">
            Kelancaran
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'true', label: 'Lancar' },
              { value: 'false', label: 'Tidak lancar' },
            ].map((k) => (
              <label key={k.value} className="cursor-pointer inline-flex">
                <input
                  type="radio"
                  name="lancar"
                  value={k.value}
                  className="peer sr-only"
                  defaultChecked={
                    progres.lancar === null
                      ? k.value === 'true'
                      : String(progres.lancar) === k.value
                  }
                />
                <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                  {k.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-2">
          Nilai
        </label>
        <div className="flex flex-wrap gap-2">
          {nilaiOptions.map((k) => (
            <label key={k.value} className="cursor-pointer inline-flex">
              <input
                type="radio"
                name="kualitas"
                value={k.value}
                className="peer sr-only"
                defaultChecked={(progres.kualitas ?? 'sedang') === k.value}
              />
              <span className="px-4 py-1.5 border border-line rounded-lg text-sm text-ink-700 peer-checked:bg-forest-700 peer-checked:text-cream-50 peer-checked:border-forest-700 transition">
                {k.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-1.5">
          Catatan / Keterangan (opsional)
        </label>
        <textarea
          name="catatan"
          rows={2}
          defaultValue={progres.catatan ?? ''}
          className="w-full px-3 py-2 bg-cream-100 border border-line rounded-lg text-sm focus:outline-none focus:border-forest-700 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {isPending ? 'Menyimpan...' : 'Simpan perubahan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-500 hover:text-ink-900"
        >
          Batal
        </button>
      </div>
    </form>
  )
}