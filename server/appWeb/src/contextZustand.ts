import { persist } from "zustand/middleware";
import { Api, UserData } from "./types";
import { create } from "zustand";

export type State = {
    user: UserData | null;
    setUser: (user: UserData) => void;
    clearUser: () => void;
    apis: Api[];
    setApis: (apis: Api[]) => void;
    clearApis: () => void;
}

export const useStore = create<State>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user: UserData) => set({ user }),
            clearUser: () => set({ user: null }),
            apis: [],
            setApis: (apis: Api[]) => set({ apis }),
            clearApis: () => set({ apis: [] }),
        }),
        {
            name: "storage",
            partialize: (state) => {
                const { apis, ...rest } = state;
                return rest;
            },
        },
    )

);