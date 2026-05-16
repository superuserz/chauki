import { create } from 'zustand';

type Toast = { id: number; message: string };
type ToastStore = {
  current: Toast | null;
  show: (message: string) => void;
  dismiss: () => void;
};

let nextId = 1;
let activeTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastStore>((set) => ({
  current: null,
  show: (message) => {
    if (activeTimer) clearTimeout(activeTimer);
    const t = { id: nextId++, message };
    set({ current: t });
    activeTimer = setTimeout(() => {
      set((s) => (s.current?.id === t.id ? { current: null } : s));
      activeTimer = null;
    }, 1500);
  },
  dismiss: () => {
    if (activeTimer) clearTimeout(activeTimer);
    set({ current: null });
  },
}));
