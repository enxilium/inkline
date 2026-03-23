import * as React from "react";

import { shouldShiftDisplayColorsForCurrentTheme } from "./displayColorShift";

export function useDisplayColorShiftEnabled(): boolean {
    const [enabled, setEnabled] = React.useState(() =>
        shouldShiftDisplayColorsForCurrentTheme(),
    );

    React.useEffect(() => {
        const update = () => {
            setEnabled(shouldShiftDisplayColorsForCurrentTheme());
        };

        update();

        const observer = new MutationObserver((mutations) => {
            const hasThemeMutation = mutations.some(
                (mutation) =>
                    mutation.type === "attributes" &&
                    mutation.attributeName === "data-theme",
            );

            if (hasThemeMutation) {
                update();
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    return enabled;
}
