import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export function Card({ children, className, hover = true }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-border bg-card p-6",
                hover &&
                    "transition-all duration-300 hover:border-primary/30 hover:bg-card-hover",
                className,
            )}
        >
            {children}
        </div>
    );
}
