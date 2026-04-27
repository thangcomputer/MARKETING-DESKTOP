import { create } from 'zustand';

/**
 * Theme store — handles dark/light mode toggle
 */
export const useThemeStore = create((set, get) => ({
  theme: 'dark', // 'dark' | 'light'

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: newTheme });

    // Apply to DOM
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  },

  initTheme: () => {
    const { theme } = get();
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  },
}));
