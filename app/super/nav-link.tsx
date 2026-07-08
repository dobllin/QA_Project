'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/super' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-md text-sm transition ${
        isActive
          ? 'bg-cream-200 text-forest-800 font-medium'
          : 'text-ink-700 hover:bg-cream-200/60'
      }`}
    >
      {children}
    </Link>
  )
}