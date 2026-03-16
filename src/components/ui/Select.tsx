'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  showPlaceholder?: boolean
  className?: string
  disabled?: boolean
  dropUp?: boolean
}

interface DropdownPos {
  top: number
  left: number
  width: number
  openUp: boolean
}

export function Select({ value, onChange, options, placeholder = 'Seleziona...', showPlaceholder = true, className = '', disabled = false, dropUp = false }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  // Calcola posizione fixed ogni volta che il dropdown apre
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = dropUp || spaceBelow < 200 && spaceAbove > spaceBelow
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp,
    })
  }, [open, dropUp])

  // Ricalcola posizione on scroll/resize mentre è aperto
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const openUp = dropUp || spaceBelow < 200 && spaceAbove > spaceBelow
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      })
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, dropUp])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const dropdown = open && pos ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
      }}
      className="bg-[#12121f] border border-white/15 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
    >
      {showPlaceholder && (
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false) }}
          className="w-full px-3 py-2 text-sm text-left text-gray-600 hover:bg-white/5 transition-colors"
        >
          {placeholder}
        </button>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setOpen(false) }}
          className={`w-full px-3 py-2 text-sm text-left transition-colors ${
            opt.value === value
              ? 'bg-white/10 text-white'
              : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ) : null

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm hover:border-white/20 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`truncate ${selected ? 'text-gray-300' : 'text-gray-600'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={13}
          className={`text-gray-600 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  )
}
