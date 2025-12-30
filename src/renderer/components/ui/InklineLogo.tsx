import * as React from "react";

export type InklineLogoProps = {
    width?: number;
    height?: number;
    className?: string;
};

export const InklineLogo: React.FC<InklineLogoProps> = ({
    width,
    height,
    className,
}) => {
    const gradientId = React.useId();

    const strokeWidth = 2;

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 28 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <defs> 
                <linearGradient
                    id={gradientId}
                    x1="0%" 
                    y1="0%" 
                    x2="100%"
                    y2="0%"
                >
                    <stop offset="0%" style={{ stopColor: "var(--accent)" }} />
                    <stop
                        offset="100%"
                        style={{ stopColor: "var(--accent-light)" }}
                    />
                </linearGradient>
            </defs>
            <path
                d="M1 9C6.5 7 10 7 14 9C18 11 21.5 11 27 9"
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
};

export const InklineLogoLoading: React.FC<InklineLogoProps> = ({
    width = 120,
    height = 24,
    className,
}) => {
    const gradientId = React.useId();

    // Matches the previous loading-screen look (old default 3 * scale(0.8)).
    const strokeWidth = 2.4;

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 100 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                >
                    <stop offset="0%" style={{ stopColor: "var(--accent)" }} />
                    <stop
                        offset="100%"
                        style={{ stopColor: "var(--accent-light)" }}
                    />
                </linearGradient>
            </defs>
            <path
                d="M1 12C15 12 15 4 30 4C45 4 45 20 60 20C75 20 75 12 99 12"
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
};
