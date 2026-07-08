'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createProgres, deleteProgres } from './actions'

type Santri = {
  id: string
  nama: string
  kelas: string | null
  halaqoh: string | null
  tahun_masuk: number | null
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
  surah_mulai: string | null
  ayat_mulai: number | null
  surah_selesai: string | null
  ayat_selesai: number | null
  kitab_nama: string | null
  bab: string | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  iqro_jilid: number | null
  iqro_halaman: number | null
  kualitas: string | null
  catatan: string | null
  profiles: { nama: string } | null
}

type ProgresType = 'tahfiz' | 'kitab' | 'iqro' | 'other'

function getProgresType(kategoriNama: string): ProgresType {
  const lower = kategoriNama.toLowerCase()
  if (lower.includes('kitab')) return 'kitab'
  if (lower.includes('iqro') || lower.includes('iqra')) return 'iqro'
  if (lower.includes('tahfiz') || lower.includes('hafalan') || lower.includes('surat'))
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

const kualitasLabel: Record<string, string> = {
  lancar: 'Lancar',
  cukup: 'Cukup',
  ulang: 'Perlu diulang',
}

export default function SantriDetailClient({
  santri,
  kategoriList,
  progressHistory,
  institusiId,
  isAdmin,
}: {
  santri: Santri
  kategoriList: Kategori[]
  progressHistory: Progres[]
  institusiId: number
  isAdmin: boolean
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
    santri.tahun_masuk && {
      label: 'Masuk',
      value: String(santri.tahun_masuk),
    },
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

      {kategoriList.length === 0 ? (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Kamu belum mengampu santri ini di kategori manapun.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs kategori */}
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

              {/* Form input */}
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
                  />
                )}
              </div>

              {/* History */}
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
                        progresType={getProgresType(activeKategori.nama)}
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

function ProgresForm({
  santriId,
  kategoriId,
  kategoriNama,
  institusiId,
}: {
  santriId: string
  kategoriId: number
  kategoriNama: string
  institusiId: number
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const progresType = getProgresType(kategoriNama)

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

      <div>
        <label className="block text-xs font-medium text-ink-700 mb-2">
          Kualitas
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'lancar', label: 'Lancar' },
            { value: 'cukup', label: 'Cukup' },
            { value: 'ulang', label: 'Perlu diulang' },
          ].map((k) => (
            <label
              key={k.value}
              className="cursor-pointer inline-flex items-center gap-2"
            >
              <input
                type="radio"
                name="kualitas"
                value={k.value}
                className="peer sr-only"
                defaultChecked={k.value === 'lancar'}
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
          Catatan (opsional)
        </label>
        <textarea
          name="catatan"
          rows={3}
          placeholder="Tajwid perlu diperhatikan..."
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

  const summary: string[] = []
  if (progresType === 'tahfiz') {
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

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-sm font-medium text-forest-800">
              {formatTanggal(progres.tanggal)}
            </div>
            {progres.kualitas && (
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${
                  progres.kualitas === 'lancar'
                    ? 'bg-success-500/10 text-success-500 border border-success-500/30'
                    : progres.kualitas === 'ulang'
                    ? 'bg-error-500/10 text-error-500 border border-error-500/30'
                    : 'bg-copper-500/10 text-copper-600 border border-copper-500/30'
                }`}
              >
                {kualitasLabel[progres.kualitas] ?? progres.kualitas}
              </span>
            )}
          </div>
          {summary.length > 0 && (
            <div className="text-sm text-ink-700 mb-1">
              {summary.join(' · ')}
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
        <button
          onClick={() => {
            if (confirm('Hapus setoran ini?')) {
              startTransition(async () => {
                await deleteProgres(institusiId, progres.id)
              })
            }
          }}
          disabled={isPending}
          className="text-xs text-error-500 hover:underline disabled:opacity-50 shrink-0"
        >
          Hapus
        </button>
      </div>
    </div>
  )
}