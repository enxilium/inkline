import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface ContainerProps {
    children: ReactNode;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
};

export function Container({
    children,
    className,
    size = "lg",
}: ContainerProps) {
    return (
        <div
            className={cn(
                "mx-auto w-full px-6 md:px-8",
                sizeStyles[size],
                className,
            )}
        >
            {children}
        </div>
    );
}
