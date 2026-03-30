// Standalone layout for the public wishlist page — no sidebar, no bottom nav, no auth required.

export default function PublicWishlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      {children}
    </div>
  )
}
