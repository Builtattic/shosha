import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="flex h-full w-full items-center justify-center rounded-full transition-colors hover:bg-muted"
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={16} className="text-muted-foreground" />
      ) : (
        <Moon size={16} className="text-muted-foreground" />
      )}
    </button>
  );
}
