// Standalone public layout — no sidebar, no bottom nav, no auth required.
// Used for shared trip pages accessible without a Supabase session.

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      {children}
    </div>
  )
}
