'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Activity,
  Wallet,
  Kanban,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    module: 'home',
    color: 'text-slate-300',
    glow: 'shadow-slate-400/40',
    activeBg: 'bg-slate-400/10',
    border: 'border-slate-400/40',
  },
  {
    href: '/fitness',
    label: 'Fitness',
    icon: Activity,
    module: 'fitness',
    color: 'text-orange-400',
    glow: 'shadow-orange-500/40',
    activeBg: 'bg-orange-500/10',
    border: 'border-orange-400/40',
  },
  {
    href: '/finance',
    label: 'Finanze',
    icon: Wallet,
    module: 'finance',
    color: 'text-emerald-400',
    glow: 'shadow-emerald-500/40',
    activeBg: 'bg-emerald-500/10',
    border: 'border-emerald-400/40',
  },
  {
    href: '/projects',
    label: 'Progetti',
    icon: Kanban,
    module: 'projects',
    color: 'text-purple-400',
    glow: 'shadow-purple-500/40',
    activeBg: 'bg-purple-500/10',
    border: 'border-purple-400/40',
  },
  {
    href: '/profile',
    label: 'Profilo',
    icon: User,
    module: 'profile',
    color: 'text-sky-400',
    glow: 'shadow-sky-500/40',
    activeBg: 'bg-sky-500/10',
    border: 'border-sky-400/40',
  },
]

function getActiveModule(pathname: string) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/fitness')) return 'fitness'
  if (pathname.startsWith('/finance')) return 'finance'
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/profile')) return 'profile'
  return 'home'
}

function getPageLabel(module: string) {
  return NAV_ITEMS.find((i) => i.module === module)?.label ?? 'Ottoboard'
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const activeModule = getActiveModule(pathname)
  const activeItem = NAV_ITEMS.find((i) => i.module === activeModule)

  useEffect(() => {
    const client = createClient()
    client.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email?.split('@')[0] ?? null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    const client = createClient()
    await client.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0a0a0f] text-white flex">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-orange-600/5 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-purple-600/5 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-emerald-600/5 blur-3xl" />
      </div>

      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <aside
        className={[
          'hidden md:flex flex-col fixed left-0 top-0 h-full z-40',
          'border-r border-white/[0.06]',
          'bg-white/[0.03] backdrop-blur-2xl',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[220px]',
        ].join(' ')}
      >
        {/* Logo + collapse toggle */}
        <div className={[
          'flex items-center h-16 px-3 border-b border-white/[0.06] gap-2',
          collapsed ? 'justify-center' : '',
        ].join(' ')}>
          {!collapsed && (
            <>
              <Image
                src="/icons/icon-192x192.png"
                alt="Ottoboard"
                width={32}
                height={32}
                className="rounded-lg flex-shrink-0"
              />
              <span className="text-sm font-semibold tracking-wide text-white/90 flex-1">
                Ottoboard
              </span>
            </>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200 flex-shrink-0"
            title={collapsed ? 'Espandi sidebar' : 'Chiudi sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen size={16} />
              : <PanelLeftClose size={16} />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeModule === item.module
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={[
                  'flex items-center rounded-xl transition-all duration-200',
                  'border',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? `${item.activeBg} ${item.border} ${item.glow} shadow-lg`
                    : 'border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]',
                ].join(' ')}
              >
                <Icon
                  size={18}
                  className={[
                    'flex-shrink-0 transition-colors duration-200',
                    isActive ? item.color : 'text-white/40',
                  ].join(' ')}
                />
                {!collapsed && (
                  <span className={[
                    'text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-white/95' : 'text-white/50',
                  ].join(' ')}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-4 space-y-1 border-t border-white/[0.06] pt-3">
          <div className={[
            'flex items-center rounded-xl px-2 py-2',
            collapsed ? 'justify-center' : 'gap-2.5',
          ].join(' ')}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-white/60" />
            </div>
            {!collapsed && (
              <span className="text-xs text-white/40 truncate flex-1">{userName ?? '…'}</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={[
              'flex items-center w-full rounded-xl px-2 py-2 transition-all duration-200',
              'text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20',
              collapsed ? 'justify-center' : 'gap-2.5',
            ].join(' ')}
          >
            <LogOut size={15} className="flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Top navbar (mobile) ───────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-2xl">
        {/* Logo + page title */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/icon-192x192.png"
            alt="Ottoboard"
            width={28}
            height={28}
            className="rounded-lg flex-shrink-0"
          />
          <span className={['text-sm font-semibold', activeItem?.color ?? 'text-white/80'].join(' ')}>
            {getPageLabel(activeModule)}
          </span>
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
              <User size={11} className="text-white/60" />
            </div>
            <span className="text-xs text-white/40 max-w-[80px] truncate">{userName ?? '…'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Bottom nav (mobile) ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-16 border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-2xl px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeModule === item.module
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                isActive ? item.activeBg : '',
              ].join(' ')}
            >
              <Icon size={20} className={isActive ? item.color : 'text-white/30'} />
              <span className={[
                'text-[10px] font-medium',
                isActive ? 'text-white/80' : 'text-white/25',
              ].join(' ')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <main
        className={[
          'flex-1 min-h-screen overflow-x-clip transition-all duration-300',
          'pt-14 pb-16 md:pt-0 md:pb-0',
          collapsed ? 'md:ml-[72px]' : 'md:ml-[220px]',
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  )
}
