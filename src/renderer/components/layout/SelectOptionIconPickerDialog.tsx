import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import { Input } from "../ui/Input";
import {
    SELECT_OPTION_ICON_CATALOG,
    resolveSelectOptionIconEntry,
    type SelectOptionIconCatalogEntry,
} from "../ui/selectOptionIconCatalog";

type Props = {
    open: boolean;
    selectedIconKey?: string | null;
    onOpenChange: (open: boolean) => void;
    onSelect: (iconKey: string) => void;
};

export const SelectOptionIconPickerDialog: React.FC<Props> = ({
    open,
    selectedIconKey,
    onOpenChange,
    onSelect,
}) => {
    const [query, setQuery] = React.useState("");

    React.useEffect(() => {
        if (!open) {
            setQuery("");
        }
    }, [open]);

    const selected = resolveSelectOptionIconEntry(selectedIconKey);

    const filteredIcons = React.useMemo<SelectOptionIconCatalogEntry[]>(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return SELECT_OPTION_ICON_CATALOG;
        }

        return SELECT_OPTION_ICON_CATALOG.filter((entry) =>
            `${entry.label} ${entry.key}`.toLowerCase().includes(normalizedQuery),
        );
    }, [query]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="select-option-icon-dialog">
                <DialogHeader>
                    <DialogTitle>Choose option icon</DialogTitle>
                    <DialogDescription>
                        Pick an icon from the catalog. Selected icon: {selected.label}.
                    </DialogDescription>
                </DialogHeader>
                <div className="select-option-icon-dialog-body">
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search icons..."
                    />
                    <div className="select-option-icon-grid" role="listbox">
                        {filteredIcons.map((entry) => {
                            const Icon = entry.Icon;
                            const isSelected = selected.key === entry.key;

                            return (
                                <button
                                    key={entry.key}
                                    type="button"
                                    className={`select-option-icon-cell${isSelected ? " is-selected" : ""}`}
                                    onClick={() => {
                                        onSelect(entry.key);
                                        onOpenChange(false);
                                    }}
                                    title={entry.label}
                                    aria-label={`Use ${entry.label}`}
                                    aria-selected={isSelected}
                                >
                                    <Icon sx={{ fontSize: 18 }} />
                                    <span>{entry.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
