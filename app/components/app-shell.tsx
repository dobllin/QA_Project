'use client'

// ============================================================
// FILE: app/components/app-shell.tsx
//
// Kerangka halaman yang responsif dipakai bersama oleh layout
// institusi dan layout super admin.
//
// - Desktop (>=1024px / lg): sidebar tetap menempel di kiri seperti biasa.
// - Mobile & tablet (<1024px): sidebar disembunyikan dan muncul sebagai
//   drawer geser dari kiri, dibuka lewat tombol hamburger di header atas.
//   Drawer menutup sendiri saat pindah halaman atau menekan latar gelap.
//
// `sidebar` diisi konten sidebar (header + nav + footer) dari masing-masing
// layout. `brand` tampil di header mobile biar user tahu sedang di mana.
// ============================================================

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function AppShell({
  sidebar,
  brand,
  children,
  logoPosition = 'top',
}: {
  sidebar: React.ReactNode
  brand: React.ReactNode
  children: React.ReactNode
  // Posisi logo pojok kanan.
  //  'top'    : sejajar header (default, dipakai halaman institusi)
  //  'bottom' : agak turun ke bawah, dipakai halaman yang tombolnya di kanan
  //             atas (mis. super admin) supaya logo tidak menutup tombol.
  logoPosition?: 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Tutup drawer tiap kali pindah halaman.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Kunci scroll body selama drawer terbuka (mobile).
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  return (
    <div className="min-h-screen lg:flex">
      {/* Header mobile: hanya tampil di bawah lg */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-cream-50/95 backdrop-blur px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-line text-ink-700 hover:bg-cream-200/60 transition"
        >
          {/* ikon hamburger */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 4.5h14M2 9h14M2 13.5h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">{brand}</div>
      </header>

      {/* Latar gelap saat drawer terbuka */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-ink-900/40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar:
          - lg: statik, lebar 64, bagian dari flow flex
          - <lg: fixed drawer, geser masuk saat open */}
      <aside
        className={[
          'bg-cream-50 border-line flex flex-col shrink-0',
          // mobile drawer
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // desktop statik
          'lg:static lg:z-auto lg:translate-x-0 lg:w-64 lg:max-w-none',
        ].join(' ')}
      >
        {/* tombol tutup, hanya mobile */}
        <div className="lg:hidden flex justify-end p-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink-500 hover:bg-cream-200/60 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">{sidebar}</div>
      </aside>

      {/* Konten utama */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="relative max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-12 lg:py-12">
          {/* Logo pesantren di pojok kanan. Selalu tampil; posisinya yang
              beda: 'top' sejajar header, 'bottom' turun ke bawah tombol. */}
          <div
            className={[
              'pointer-events-none absolute z-10 right-4 sm:right-6 lg:right-12',
              logoPosition === 'bottom'
                ? 'top-24 sm:top-24 lg:top-28'
                : 'top-4 sm:top-6 lg:top-10',
            ].join(' ')}
          >
            <Image
              src="/logo-qa.jpg"
              alt="Logo Pondok Pesantren Tahfiz Qurrota A'yun"
              width={80}
              height={80}
              priority
              unoptimized
              className="w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 object-contain rounded-lg"
            />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}