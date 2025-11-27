import * as React from "react";
import classNames from "clsx";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className, ...props }, ref) => (
        <label
            ref={ref}
            className={classNames("label", className)}
            {...props}
        />
    )
);

Label.displayName = "Label";
