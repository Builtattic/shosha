import { cn } from '@/lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'min-h-11 w-full rounded border border-border bg-dim px-3 text-sm text-text outline-none transition placeholder:text-subtle focus:border-accent',
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
        'min-h-28 w-full resize-none rounded border border-border bg-dim px-3 py-3 text-sm leading-6 text-text outline-none transition placeholder:text-subtle focus:border-accent',
        props.className
      )}
    />
  );
}
