import * as React from "react";
import classNames from "clsx";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", ...props }, ref) => {
        return (
            <input
                type={type}
                className={classNames("input", className)}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";
