import React from "react";
import { useAppStore } from "../../state/appStore";
import { DocumentBinder } from "../workspace/DocumentBinder";
import type { WorkspaceDocumentKind } from "../../types";

export const ConnectedDocumentBinder: React.FC<{
    activeKind?: WorkspaceDocumentKind;
    onActiveKindChange?: (kind: WorkspaceDocumentKind) => void;
    showTabbar?: boolean;
}> = ({ activeKind, onActiveKindChange, showTabbar }) => {
    const store = useAppStore();

    return (
        <DocumentBinder
            chapters={store.chapters}
            scrapNotes={store.scrapNotes}
            characters={store.characters}
            locations={store.locations}
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
            onReorderOrganizations={store.reorderOrganizations}
            onToggleCollapse={store.toggleBinder}
            isBinderOpen={store.isBinderOpen}
        />
    );
};
