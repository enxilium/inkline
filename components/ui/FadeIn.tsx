"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right" | "none";
}

export function FadeIn({
    children,
    className,
    delay = 0,
    direction = "up",
}: FadeInProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        el.classList.add(
                            "opacity-100",
                            "translate-x-0",
                            "translate-y-0",
                        );
                        el.classList.remove(
                            "opacity-0",
                            "translate-y-8",
                            "-translate-y-8",
                            "translate-x-8",
                            "-translate-x-8",
                        );
                    }, delay);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);

    const directionClass = {
        up: "translate-y-8",
        down: "-translate-y-8",
        left: "translate-x-8",
        right: "-translate-x-8",
        none: "",
    }[direction];

    return (
        <div
            ref={ref}
            className={cn(
                "opacity-0 transition-all duration-700 ease-out",
                directionClass,
                className,
            )}
        >
            {children}
        </div>
    );
}
