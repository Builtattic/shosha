import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-accent text-bg hover:bg-accent/90',
    secondary: 'border border-border bg-raised text-text hover:border-accent',
    danger: 'bg-danger text-text hover:bg-danger/90',
    ghost: 'bg-transparent text-text hover:bg-raised'
  };

  return (
    <button
      {...props}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded border px-4 py-2 text-sm font-bold uppercase tracking-normal transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' ? 'border-accent' : 'border-transparent',
        variants[variant],
        className
      )}
    />
  );
}
