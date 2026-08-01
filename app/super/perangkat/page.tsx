// ============================================================
// FILE: app/super/perangkat/page.tsx
//
// Halaman "Perangkat Ajar AI" untuk super admin.
// Server component tipis: cuma judul + render shell interaktif.
// Akses sudah dijaga oleh app/super/layout.tsx (cek is_super_admin),
// jadi tidak perlu verifikasi ulang di sini.
// ============================================================

import PerangkatClient from './perangkat-client'

export default function PerangkatPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-copper-600 mb-2">
          Perangkat Ajar AI
        </div>
        <h1 className="font-display text-5xl text-forest-800 leading-none">
          Rakit perangkat ajar
        </h1>
        <p className="mt-4 text-sm text-ink-500 max-w-md leading-relaxed">
          Susun modul ajar, bahan ajar, asesmen, media interaktif, dan infografis
          dengan bantuan AI. Hasilnya bisa langsung diunduh.
        </p>
      </div>

      <div className="divider-double mb-8" />

      <PerangkatClient />
    </div>
  )
}