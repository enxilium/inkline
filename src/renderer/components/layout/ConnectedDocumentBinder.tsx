import React from "react";
import { useAppStore } from "../../state/appStore";
import { DocumentBinder } from "../workspace/DocumentBinder";
import type { WorkspaceDocumentKind } from "../../types";

export const ConnectedDocumentBinder: React.FC<{
    activeKind?: WorkspaceDocumentKind;
    onActiveKindChange?: (kind: WorkspaceDocumentKind) => void;
    showTabbar?: boolean;
    onEditTemplate?: (kind: "character" | "location" | "organization") => void;
}> = ({ activeKind, onActiveKindChange, showTabbar, onEditTemplate }) => {
    const store = useAppStore();

    return (
        <DocumentBinder
            chapters={store.chapters}
            scrapNotes={store.scrapNotes}
            characters={store.characters}
            locations={store.locations}
            rootLocationIds={store.workspaceProject?.locationIds ?? []}
            organizations={store.organizations}
            activeDocument={store.activeDocument}
            activeKind={activeKind}
            onActiveKindChange={onActiveKindChange}
            showTabbar={showTabbar}
            onSelect={store.setActiveDocument}
            onCreateChapter={store.createChapterEntry}
            onCreateScrapNote={store.createScrapNoteEntry}
            onCreateCharacter={store.createCharacterEntry}
            onCreateLocation={store.createLocationEntry}
            onCreateOrganization={store.createOrganizationEntry}
            onDeleteChapter={store.deleteChapter}
            onDeleteScrapNote={store.deleteScrapNote}
            onDeleteCharacter={store.deleteCharacter}
            onDeleteLocation={store.deleteLocation}
            onDeleteOrganization={store.deleteOrganization}
            onReorderChapters={store.reorderChapters}
            onReorderScrapNotes={store.reorderScrapNotes}
            onReorderCharacters={store.reorderCharacters}
            onReorderLocations={store.reorderLocations}
            onMoveLocation={store.moveLocationInTree}
            onReorderOrganizations={store.reorderOrganizations}
            onEditTemplate={onEditTemplate}
            onToggleCollapse={store.toggleBinder}
            isBinderOpen={store.isBinderOpen}
        />
    );
};
