'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProgres } from '../../santri/[santriId]/actions'

type ProgresType = 'tahfiz' | 'kitab' | 'iqro' | 'other'

type Santri = {
  id: string
  nama: string
  kelas: string | null
  done: boolean
}

const jenisSetoranOptions = [
  { value: 'hafalan_baru', label: 'Hafalan baru' },
  { value: 'setoran', label: 'Setoran' },
  { value: 'murojaah', label: 'Murojaah' },
]

const nilaiOptions = [
  { value: 'kurang', label: 'Kurang' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sangat_bagus', label: 'Sangat bagus' },
]

const selectClass =
  'w-full border border-line rounded-lg px-3 py-2 text-sm text-ink-900 bg-cream-50 focus:border-forest-700 focus:outline-none transition'
const labelClass = 'block text-xs font-medium text-ink-700 mb-1.5'

export default function SetoranClient({
  institusiId,
  kategoriId,
  progresType,
  santri,
}: {
  institusiId: number
  kategoriId: number
  progresType: ProgresType
  santri: Santri[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="grid gap-2">
      {santri.map((s) => {
        const isOpen = openId === s.id
        return (
          <div
            key={s.id}
            className="bg-cream-50 border border-line rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenId(isOpen ? null : s.id)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-cream-200/40 transition"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-forest-800">
                  {s.nama}
                </div>
                {s.kelas && (
                  <div className="text-xs text-ink-500 mt-0.5">
                    Kelas {s.kelas}
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${
                  s.done
                    ? 'text-success-500 bg-success-500/10 border-success-500/30'
                    : 'text-copper-600 bg-copper-500/10 border-copper-500/30'
                }`}
              >
                {s.done ? '✓ Sudah diisi' : isOpen ? 'Tutup' : 'Belum · isi'}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-line p-5">
                <SetoranForm
                  institusiId={institusiId}
                  kategoriId={kategoriId}
                  santriId={s.id}
                  progresType={progresType}
                  sudahAda={s.done}
                  onDone={() => setOpenId(null)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SetoranForm({
  institusiId,
  kategoriId,
  santriId,
  progresType,
  sudahAda,
  onDone,
}: {
  institusiId: number
  kategoriId: number
  santriId: string
  progresType: ProgresType
  sudahAda: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hadir, setHadir] = useState(true)

  const hariIni = new Date().toISOString().split('T')[0]

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          setError(null)
          fd.append('kategori_id', String(kategoriId))
          const result = await createProgres(institusiId, santriId, fd)
          if (result?.error) {
            setError(result.error)
          } else {
            router.refresh()
            onDone()
          }
        })
      }}
      className="space-y-4"
    >
      {sudahAda && (
        <div className="p-3 bg-copper-500/10 border border-copper-500/30 rounded-lg text-xs text-ink-700 leading-relaxed">
          Santri ini sudah punya setoran hari ini. Aturannya 1× sehari, jadi
          kirim ulang bakal ditolak. Buka halaman detail santri kalau mau
          mengubah entri yang sudah ada.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tanggal</label>
          <input
            type="date"
            name="tanggal"
            defaultValue={hariIni}
            className={selectClass}
          />
        </div>
        <div>
          <label className={labelClass}>Absen</label>
          {/* absen=true artinya TIDAK hadir (ngikutin kolom yg udah ada) */}
          <select
            name="absen"
            defaultValue="false"
            onChange={(e) => setHadir(e.target.value === 'false')}
            className={selectClass}
          >
            <option value="false">Hadir</option>
            <option value="true">Tidak hadir</option>
          </select>
        </div>
      </div>

      {hadir && progresType === 'tahfiz' && (
        <>
          <div>
            <label className={labelClass}>Jenis setoran</label>
            <select
              name="jenis_setoran"
              defaultValue="setoran"
              className={selectClass}
            >
              {jenisSetoranOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Surah mulai</label>
              <input name="surah_mulai" className={selectClass} />
            </div>
            <div>
              <label className={labelClass}>Ayat mulai</label>
              <input type="number" name="ayat_mulai" className={selectClass} />
            </div>
            <div>
              <label className={labelClass}>Surah selesai</label>
              <input name="surah_selesai" className={selectClass} />
            </div>
            <div>
              <label className={labelClass}>Ayat selesai</label>
              <input
                type="number"
                name="ayat_selesai"
                className={selectClass}
              />
            </div>
          </div>
        </>
      )}

      {hadir && progresType === 'kitab' && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nama kitab</label>
              <input name="kitab_nama" className={selectClass} />
            </div>
            <div>
              <label className={labelClass}>Bab</label>
              <input name="bab" className={selectClass} />
            </div>
            <div>
              <label className={labelClass}>Halaman mulai</label>
              <input
                type="number"
                name="halaman_mulai"
                className={selectClass}
              />
            </div>
            <div>
              <label className={labelClass}>Halaman selesai</label>
              <input
                type="number"
                name="halaman_selesai"
                className={selectClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tersampaikan</label>
            <select
              name="tersampaikan"
              defaultValue="true"
              className={selectClass}
            >
              <option value="true">Ya</option>
              <option value="false">Belum</option>
            </select>
          </div>
        </>
      )}

      {hadir && progresType === 'iqro' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Jilid</label>
            <input type="number" name="iqro_jilid" className={selectClass} />
          </div>
          <div>
            <label className={labelClass}>Halaman</label>
            <input type="number" name="iqro_halaman" className={selectClass} />
          </div>
        </div>
      )}

      {hadir && progresType !== 'kitab' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Kelancaran</label>
            <select name="lancar" defaultValue="true" className={selectClass}>
              <option value="true">Lancar</option>
              <option value="false">Tidak lancar</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Nilai</label>
            <select
              name="kualitas"
              defaultValue="sedang"
              className={selectClass}
            >
              {nilaiOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!hadir && (
        <div>
          <label className={labelClass}>Kendala / alasan</label>
          <input
            name="kendala"
            placeholder="Sakit, izin, alpa..."
            className={selectClass}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Catatan (opsional)</label>
        <textarea name="catatan" rows={2} className={selectClass} />
      </div>

      {error && (
        <div className="p-3 bg-error-500/10 border border-error-500/30 rounded-lg text-sm text-error-500">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-sm font-medium px-5 py-2.5 rounded-lg transition"
        >
          {isPending ? 'Menyimpan...' : 'Simpan setoran'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="text-xs text-ink-500 hover:text-ink-900 disabled:opacity-50 transition"
        >
          Batal
        </button>
      </div>
    </form>
  )
}