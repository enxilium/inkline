import Link from "next/link";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    href?: string;
    external?: boolean;
    className?: string;
    type?: "button" | "submit";
    disabled?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "bg-gradient-to-r from-primary-light via-primary to-primary-dark text-background font-semibold hover:opacity-90",
    secondary:
        "border border-border text-foreground hover:border-primary/50 hover:text-primary",
    ghost: "text-muted hover:text-foreground",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
};

export function Button({
    children,
    variant = "primary",
    size = "md",
    href,
    external,
    className,
    type = "button",
    disabled,
}: ButtonProps) {
    const styles = cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "opacity-50 cursor-not-allowed",
        className,
    );

    if (href) {
        if (external) {
            return (
                <a
                    href={href}
                    className={styles}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            );
        }
        return (
            <Link href={href} className={styles}>
                {children}
            </Link>
        );
    }

    return (
        <button type={type} className={styles} disabled={disabled}>
            {children}
        </button>
    );
}
