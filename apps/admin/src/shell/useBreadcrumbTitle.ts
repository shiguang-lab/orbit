import { create } from "zustand";

interface BreadcrumbTitleState {
  customTitle: string | null;
  setCustomTitle: (customTitle: string | null) => void;
}

export const useBreadcrumbTitle = create<BreadcrumbTitleState>((set) => ({
  customTitle: null,
  setCustomTitle: (customTitle) => set({ customTitle }),
}));
