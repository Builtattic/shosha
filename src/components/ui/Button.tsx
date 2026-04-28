import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
};

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-foreground text-background hover:bg-foreground/90',
    secondary: 'bg-muted text-foreground hover:bg-muted/80',
    danger: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    outline: 'bg-transparent text-foreground border border-border hover:bg-muted'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-6 py-3 text-[14px]',
    lg: 'px-8 py-4 text-[16px]',
    icon: 'p-2'
  };

  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
    />
  );
}
