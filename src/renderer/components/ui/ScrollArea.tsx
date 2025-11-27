import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import cx from "clsx";

export const ScrollArea = React.forwardRef<
    React.ElementRef<typeof ScrollAreaPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root
        ref={ref}
        className={cx("scroll-area", className)}
        {...props}
    >
        <ScrollAreaPrimitive.Viewport className="scroll-area-viewport">
            {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
            orientation="vertical"
            className="scrollbar"
        >
            <ScrollAreaPrimitive.Thumb className="scrollbar-thumb" />
        </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = "ScrollArea";
