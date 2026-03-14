import { create } from 'zustand'

interface ProjectStore {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  openTaskId: string | null
  setOpenTaskId: (id: string | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  openTaskId: null,
  setOpenTaskId: (id) => set({ openTaskId: id }),
}))
