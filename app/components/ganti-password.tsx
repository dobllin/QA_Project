'use client'

// ============================================================
// FILE: app/components/ganti-password.tsx
// Tombol + form kecil buat user ganti password akunnya sendiri.
// Dipasang di sidebar (dekat tombol Keluar). Bisa dipakai admin,
// ustadz, ustadzah, maupun super admin — semua akun sendiri.
// ============================================================

import { useState, useTransition } from 'react'
import { ubahPasswordSendiri } from '@/app/account/actions'

export default function GantiPassword() {
  const [buka, setBuka] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const simpan = () => {
    setPesan(null)
    if (pw.length < 6) {
      setPesan({ ok: false, teks: 'Password minimal 6 karakter.' })
      return
    }
    if (pw !== pw2) {
      setPesan({ ok: false, teks: 'Konfirmasi password tidak sama.' })
      return
    }
    startTransition(async () => {
      const res = await ubahPasswordSendiri(pw)
      if (res?.error) {
        setPesan({ ok: false, teks: res.error })
      } else {
        setPesan({ ok: true, teks: 'Password berhasil diganti.' })
        setPw('')
        setPw2('')
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setBuka((v) => !v)
          setPesan(null)
          setPw('')
          setPw2('')
        }}
        className="text-xs text-ink-500 hover:text-ink-900 transition"
      >
        {buka ? 'Tutup ganti password' : 'Ganti password'}
      </button>

      {buka && (
        <div className="mt-2 p-3 bg-cream-100 border border-line rounded-lg space-y-2">
          <div>
            <label className="block text-[11px] font-medium text-ink-700 mb-1">
              Password baru
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-2.5 py-1.5 bg-cream-50 border border-line rounded-md text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-700 mb-1">
              Ulangi password baru
            </label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Ketik ulang"
              className="w-full px-2.5 py-1.5 bg-cream-50 border border-line rounded-md text-sm focus:outline-none focus:border-forest-700"
            />
          </div>

          <button
            type="button"
            onClick={simpan}
            disabled={isPending}
            className="w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-cream-50 text-xs font-medium px-3 py-1.5 rounded-md transition"
          >
            {isPending ? 'Menyimpan...' : 'Simpan password baru'}
          </button>

          {pesan && (
            <div
              className={`text-[11px] px-2 py-1.5 rounded-md border ${
                pesan.ok
                  ? 'text-success-500 bg-success-500/10 border-success-500/30'
                  : 'text-error-500 bg-error-50 border-error-500/30'
              }`}
            >
              {pesan.teks}
            </div>
          )}
        </div>
      )}
    </div>
  )
}