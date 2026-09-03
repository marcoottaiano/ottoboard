import { create } from "zustand";

const STORAGE_KEY = "ottoboard-privacy-mode";

interface PrivacyModeStore {
  isPrivate: boolean;
  toggle: () => void;
  hydrate: () => void;
}

export const usePrivacyMode = create<PrivacyModeStore>((set) => ({
  isPrivate: false,
  toggle: () =>
    set((state) => {
      const next = !state.isPrivate;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* Keep the in-memory preference when storage is unavailable. */
      }
      return { isPrivate: next };
    }),
  hydrate: () => {
    try {
      set({ isPrivate: localStorage.getItem(STORAGE_KEY) === "true" });
    } catch {
      // Retain the current preference when browser storage is unavailable.
    }
  },
}));
