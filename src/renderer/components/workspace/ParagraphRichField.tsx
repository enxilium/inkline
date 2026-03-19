import React from "react";

import type { DocumentRef } from "../ui/ListInput";
import { RichTextAreaInput } from "../ui/RichTextAreaInput";

type Props = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    syncSourceKey: string;
    rows?: number;
    placeholder: string;
    availableDocuments?: DocumentRef[];
    onNavigateToDocument?: (ref: DocumentRef) => void;
};

export const ParagraphRichField: React.FC<Props> = ({
    id,
    value,
    onChange,
    syncSourceKey,
    rows = 4,
    placeholder,
    availableDocuments = [],
    onNavigateToDocument,
}) => {
    return (
        <div className="entity-field">
            <RichTextAreaInput
                key={syncSourceKey}
                id={id}
                value={value}
                rows={rows}
                placeholder={placeholder}
                syncSourceKey={syncSourceKey}
                onChange={onChange}
                availableDocuments={availableDocuments}
                onReferenceClick={onNavigateToDocument}
            />
        </div>
    );
};
