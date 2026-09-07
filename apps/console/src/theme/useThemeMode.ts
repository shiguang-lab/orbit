import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

interface ThemeModeState {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeMode = create<ThemeModeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      toggle: () => set({ mode: get().mode === "dark" ? "light" : "dark" }),
      setMode: (mode) => set({ mode }),
    }),
    { name: "shiguangGateway-admin-theme" },
  ),
);
