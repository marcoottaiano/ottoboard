import { User as UserIcon, Mail, Calendar } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface AccountInfoSectionProps {
  user: User
}

export function AccountInfoSection({ user }: AccountInfoSectionProps) {
  const createdAt = new Date(user.created_at).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <UserIcon size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-white/80">Informazioni account</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Mail size={14} className="text-white/30 flex-shrink-0" />
          <div>
            <p className="text-xs text-white/30 mb-0.5">Email</p>
            <p className="text-sm text-white/80">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar size={14} className="text-white/30 flex-shrink-0" />
          <div>
            <p className="text-xs text-white/30 mb-0.5">Account creato il</p>
            <p className="text-sm text-white/80">{createdAt}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
