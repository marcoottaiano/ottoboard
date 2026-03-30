'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function ConditionalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/auth') || pathname.startsWith('/shared/') || pathname.startsWith('/wishlist/')) return <>{children}</>
  return <Sidebar>{children}</Sidebar>
}
