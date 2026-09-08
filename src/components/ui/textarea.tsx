import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border-strong bg-surface-muted px-3.5 py-2.5 text-sm text-foreground",
        "placeholder:text-subtle",
        "outline-none transition-[border-color,box-shadow] duration-150",
        "hover:border-foreground/20",
        "focus:border-primary focus:bg-surface focus:ring-2 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
