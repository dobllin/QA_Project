'use client'

import { useState, useTransition } from 'react'
import { assignSantriToUstadz, unassignSantri } from './actions'

type Santri = { id: string; nama: string; kelas: string | null }
type Kategori = { id: number; nama: string }
type Assignment = {
  id: string
  santri: { id: string; nama: string; kelas: string | null } | null
  kategori: { id: number; nama: string } | null
}
type Ustadz = {
  id: string
  nama: string
  peran: string
  assignments: Assignment[]
}

const peranLabel: Record<string, string> = {
  ustadz: 'Ustadz',
  ustadzah: 'Ustadzah',
}

export default function PengajarClient({
  ustadzList,
  santriList,
  kategoriList,
  institusiId,
  isAdmin,
}: {
  ustadzList: Ustadz[]
  santriList: Santri[]
  kategoriList: Kategori[]
  institusiId: number
  isAdmin: boolean
}) {
  const [assigningTo, setAssigningTo] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Kelola
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Pengajar
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Ustadz dan ustadzah yang mengajar di institusi ini. Tugaskan santri ke
          mereka per kategori pembelajaran.
        </p>
      </div>

      <div className="divider-double mb-8" />

      {ustadzList.length === 0 && (
        <div className="bg-cream-50 border border-line rounded-xl p-8 text-center">
          <p className="text-sm text-ink-500">
            Belum ada ustadz/ustadzah di institusi ini. Tambahkan lewat menu
            Pengguna di dashboard super admin.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {ustadzList.map((u) => (
          <UstadzCard
            key={u.id}
            ustadz={u}
            santriList={santriList}
            kategoriList={kategoriList}
            institusiId={institusiId}
            isAdmin={isAdmin}
            assigningOpen={assigningTo === u.id}
            onToggleAssign={() =>
              setAssigningTo((v) => (v === u.id ? null : u.id))
            }
          />
        ))}
      </div>
    </div>
  )
}

function UstadzCard({
  ustadz,
  santriList,
  kategoriList,
  institusiId,
  isAdmin,
  assigningOpen,
  onToggleAssign,
}: {
  ustadz: Ustadz
  santriList: Santri[]
  kategoriList: Kategori[]
  institusiId: number
  isAdmin: boolean
  assigningOpen: boolean
  onToggleAssign: () => void
}) {
  const [isPending, startTransition] = useTransition()

  // Group assignments per kategori
  const perKategori = new Map<
    number,
    { kategoriNama: string; items: Assignment[] }
  >()
  for (const a of ustadz.assignments) {
    if (!a.kategori) continue
    if (!perKategori.has(a.kategori.id)) {
      perKategori.set(a.kategori.id, {
        kategoriNama: a.kategori.nama,
        items: [],
      })
    }
    perKategori.get(a.kategori.id)!.items.push(a)
  }
  const grouped = Array.from(perKategori.entries())

  return (
    <div className="bg-cream-50 border border-line rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-forest-800">{ustadz.nama}</h3>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500 border border-line px-2 py-0.5 rounded">
              {peranLabel[ustadz.peran] ?? ustadz.peran}
            </span>
          </div>
          <div className="text-xs text-ink-500">
            {ustadz.assignments.length} santri ampuan
          </div>
        </div>
      </div>

      {grouped.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line/60 space-y-3">
          {grouped.map(([kategoriId, { kategoriNama, items }]) => (
            <div key={kategoriId}>
              <div className="text-[10px] font-medium uppercase tracking-widest text-copper-600 mb-2">
                {kategoriNama}
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="group inline-flex items-center gap-2 bg-cream-100 border border-line rounded-lg px-3 py-1.5"
                  >
                    <div className="text-sm">
                      <span className="text-forest-800 font-medium">
                        {a.santri?.nama}
                      </span>
                      {a.santri?.kelas && (
                        <span className="text-ink-500 ml-1.5 text-xs">
                          · {a.santri.kelas}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          startTransition(async () => {
                            await unassignSantri(institusiId, a.id)
                          })
                        }}
                        disabled={isPending}
                        className="text-ink-400 hover:text-error-500 text-xs disabled:opacity-50"
                        aria-label="Cabut"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="mt-4">
          {!assigningOpen ? (
            <button
              onClick={onToggleAssign}
              className="text-xs text-forest-700 hover:text-forest-800 underline underline-offset-4"
            >
              + Tugaskan santri ke {peranLabel[ustadz.peran] ?? ustadz.peran} ini
            </button>
          ) : (
            <AssignForm
              ustadzId={ustadz.id}
              santriList={santriList}
              kategoriList={kategoriList}
              institusiId={institusiId}
              onDone={onToggleAssign}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AssignForm({
  ustadzId,
  santriList,
  kategoriList,
  institusiId,
  onDone,
}: {
  ustadzId: string
  santriList: Santri[]
  kategoriList: Kategori[]
  institusiId: number
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          setError(null)
          fd.append('ustadz_id', ustadzId)
          const result = await assignSantriToUstadz(institusiId, fd)
          if (result?.error) setError(result.error)
          else onDone()
        })
      }}
      className="bg-cream-100 border border-line rounded-lg p-4 space-y-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-ink-500 mb-1">
            Santri
          </label>
          <select
            name="santri_id"
            required
            defaultValue=""
            className="w-full px-2.5 py-1.5 bg-cream-50 border border-line rounded text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="" disabled>
              Pilih santri...
            </option>
            {santriList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} {s.kelas ? `· ${s.kelas}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-ink-500 mb-1">
            Kategori
          </label>
          <select
            name="kategori_id"
            required
            defaultValue=""
            className="w-full px-2.5 py-1.5 bg-cream-50 border border-line rounded text-sm focus:outline-none focus:border-forest-700"
          >
            <option value="" disabled>
              Pilih kategori...
            </option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-error-50 border border-error-500/30 rounded text-xs text-error-500">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
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
      </div>
    </form>
  )
}