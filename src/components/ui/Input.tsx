import { cn } from '@/lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-[12px] border border-border bg-card px-4 py-3 text-[14px] text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary',
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full resize-none rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary',
        props.className
      )}
    />
  );
}
