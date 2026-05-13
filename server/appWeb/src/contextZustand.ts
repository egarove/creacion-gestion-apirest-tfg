import { persist } from "zustand/middleware";
import { Api, Toast, UserData } from "./types";
import { create } from "zustand";

export type State = {
  user: UserData | null;
  setUser: (user: UserData) => void;
  clearUser: () => void;
  userApisPath: string;
  setUserApisPath: (newPath: string) => void;
  apis: Api[];
  setUserApis: (apis: Api[]) => void;
  clearApis: () => void;
  toastList: Toast[];
  addToast: (newToast: Toast) => void;
  clearToast: () => void;
};

export const useContextStore = create<State>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user: UserData) => set({ user }),
      clearUser: () => set({ user: null }),
      apis: [],
      userApisPath: "",
      setUserApisPath: (newPath: string) => set({ userApisPath: newPath }),
      setUserApis: (apis: Api[]) =>
        set((state) => ({ ...state.user, apis: apis })),
      clearApis: () => set({ apis: [] }),
      toastList: [],
      addToast: (newToast: Toast) => {
        set((state) => ({ toastList: [...state.toastList, newToast] }));
        setTimeout(() => {
          set((state) => ({
            toastList: state.toastList.filter((t) => t.id !== newToast.id),
          }));
        }, 4000);
      },
      clearToast: () => set({ toastList: [] }),
    }),
    {
      name: "storage",
      partialize: (state) => {
        const { apis, ...rest } = state;
        return rest;
      },
    },
  ),
);
