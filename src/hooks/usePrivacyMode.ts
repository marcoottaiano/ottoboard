import { create } from 'zustand'

const STORAGE_KEY = 'ottoboard-privacy-mode'

interface PrivacyModeStore {
  isPrivate: boolean
  toggle: () => void
  hydrate: () => void
}

export const usePrivacyMode = create<PrivacyModeStore>((set) => ({
  isPrivate: false,
  toggle: () => set((state) => {
    const next = !state.isPrivate
    localStorage.setItem(STORAGE_KEY, String(next))
    return { isPrivate: next }
  }),
  hydrate: () => set({
    isPrivate: localStorage.getItem(STORAGE_KEY) === 'true',
  }),
}))
