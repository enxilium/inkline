import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface BadgeProps {
    children: ReactNode;
    variant?: "default" | "outline";
    className?: string;
}

export function Badge({
    children,
    variant = "default",
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                variant === "default" && "bg-primary/10 text-primary",
                variant === "outline" && "border border-border text-muted",
                className,
            )}
        >
            {children}
        </span>
    );
}
