import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountInfoSection } from '@/components/profile/AccountInfoSection'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { StravaIntegrationCard } from '@/components/profile/StravaIntegrationCard'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <main className="flex-1 p-4 md:p-6">
      <h1 className="text-xl font-bold text-white mb-6">Profilo</h1>

      <div className="max-w-lg space-y-4">
        <AccountInfoSection user={user} />
        <ChangePasswordForm />

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">
            Integrazioni
          </h3>
          <StravaIntegrationCard />
        </div>
      </div>
    </main>
  )
}
