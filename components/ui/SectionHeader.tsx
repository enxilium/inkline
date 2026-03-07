import { cn } from "@/lib/utils";

interface SectionHeaderProps {
    label?: string;
    title: string;
    description?: string;
    align?: "left" | "center";
    className?: string;
}

export function SectionHeader({
    label,
    title,
    description,
    align = "center",
    className,
}: SectionHeaderProps) {
    return (
        <div
            className={cn(
                "mb-12 md:mb-16",
                align === "center" && "text-center",
                className,
            )}
        >
            {label && (
                <p className="mb-3 text-sm font-medium tracking-widest text-primary uppercase">
                    {label}
                </p>
            )}
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                {title}
            </h2>
            {description && (
                <p className="mt-4 max-w-2xl text-lg text-muted mx-auto">
                    {description}
                </p>
            )}
        </div>
    );
}
