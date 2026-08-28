import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountInfoSection } from '@/components/profile/AccountInfoSection'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { StravaIntegrationCard } from '@/components/profile/StravaIntegrationCard'
import { BodyProfileSection } from '@/components/profile/BodyProfileSection'
import { IntegrationHealthSection } from '@/components/profile/IntegrationHealthSection'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <main className="ob-page">
      <PageHeader
        eyebrow="Account e sistema"
        title="Profilo"
        description="Identità, sicurezza e connessioni di Ottoboard."
      />

      <div className="space-y-8 max-w-6xl">
        {/* Account + password */}
        <section>
          <div className="ob-section-heading"><p className="ob-section-title">Account</p></div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr] items-start">
          <div className="space-y-4">
            <AccountInfoSection user={user} />
            <BodyProfileSection />
          </div>
          <ChangePasswordForm />
        </div>
        </section>

        {/* Integrazioni — 2 colonne su desktop */}
        <section>
          <div className="ob-section-heading"><p className="ob-section-title">Integrazioni</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <StravaIntegrationCard />
          </div>
        </section>

        {/* Salute Integrazioni */}
        <IntegrationHealthSection />
      </div>
    </main>
  )
}
