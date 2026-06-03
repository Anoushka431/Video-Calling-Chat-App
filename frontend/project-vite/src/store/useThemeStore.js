import { create } from 'zustand'
//this object will be accessible as a global state
export const useThemeStore = create((set) => ({
   theme:localStorage.getItem("streamify-theme")||"forest",
   setTheme:(theme) =>{
      localStorage.setItem("streamify-theme",theme)
      set({theme})
   }
}))