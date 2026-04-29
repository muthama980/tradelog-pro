'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
          theme === 'dark'
            ? 'border-accent text-accent bg-accent/10'
            : 'border-border text-text-muted hover:border-border-strong hover:text-text'
        }`}
      >
        <Moon size={15} />
        Dark
      </button>
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
          theme === 'light'
            ? 'border-accent text-accent bg-accent/10'
            : 'border-border text-text-muted hover:border-border-strong hover:text-text'
        }`}
      >
        <Sun size={15} />
        Light
      </button>
    </div>
  );
}
