'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateHabit } from '@/hooks/useHabits'
import { HABIT_COLORS } from '@/types/habits'

const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

interface HabitCreateModalProps {
  onClose: () => void
}

export function HabitCreateModal({ onClose }: HabitCreateModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState<string>(HABIT_COLORS[0].value)
  const [targetDays, setTargetDays] = useState<number[]>([...ALL_DAYS])

  const createHabit = useCreateHabit()

  const toggleDay = (day: number) => {
    setTargetDays((prev) =>
      prev.includes(day)
        ? prev.length > 1 ? prev.filter((d) => d !== day) : prev  // keep at least 1
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createHabit.mutate(
      {
        name: name.trim(),
        icon: icon.trim() || null,
        color,
        frequency: 'daily',
        target_days: targetDays,
      },
      {
        onSuccess: () => {
          toast.success('Abitudine creata')
          onClose()
        },
        onError: () => toast.error('Errore nella creazione'),
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Nuova abitudine</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name + Icon row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              placeholder="🎯"
              className="w-12 text-center bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-base focus:outline-none focus:border-teal-500/50"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome abitudine..."
              required
              autoFocus
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Colore</p>
            <div className="flex gap-2 flex-wrap">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-6 h-6 rounded-full border-2 transition-all duration-100"
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? 'white' : 'transparent',
                    transform: color === c.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Target days */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Giorni</p>
            <div className="flex gap-1.5">
              {ALL_DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="w-8 h-8 rounded-lg text-xs font-medium border transition-colors"
                  style={
                    targetDays.includes(day)
                      ? { backgroundColor: `${color}22`, borderColor: `${color}66`, color }
                      : {}
                  }
                  {...(!targetDays.includes(day) && {
                    className: 'w-8 h-8 rounded-lg text-xs font-medium border bg-white/5 border-white/10 text-gray-600 hover:border-white/20 transition-colors',
                  })}
                >
                  {DAY_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createHabit.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {createHabit.isPending ? 'Creazione...' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
