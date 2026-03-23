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
    const chapters = useAppStore((state) => state.chapters);
    const scrapNotes = useAppStore((state) => state.scrapNotes);
    const characters = useAppStore((state) => state.characters);
    const locations = useAppStore((state) => state.locations);
    const rootLocationIds = useAppStore(
        (state) => state.workspaceProject?.locationIds ?? [],
    );
    const organizations = useAppStore((state) => state.organizations);
    const activeDocument = useAppStore((state) => state.activeDocument);
    const setActiveDocument = useAppStore((state) => state.setActiveDocument);
    const createChapterEntry = useAppStore((state) => state.createChapterEntry);
    const createScrapNoteEntry = useAppStore(
        (state) => state.createScrapNoteEntry,
    );
    const createCharacterEntry = useAppStore(
        (state) => state.createCharacterEntry,
    );
    const createLocationEntry = useAppStore(
        (state) => state.createLocationEntry,
    );
    const createOrganizationEntry = useAppStore(
        (state) => state.createOrganizationEntry,
    );
    const deleteChapter = useAppStore((state) => state.deleteChapter);
    const deleteScrapNote = useAppStore((state) => state.deleteScrapNote);
    const deleteCharacter = useAppStore((state) => state.deleteCharacter);
    const deleteLocation = useAppStore((state) => state.deleteLocation);
    const deleteOrganization = useAppStore((state) => state.deleteOrganization);
    const reorderChapters = useAppStore((state) => state.reorderChapters);
    const reorderScrapNotes = useAppStore((state) => state.reorderScrapNotes);
    const reorderCharacters = useAppStore((state) => state.reorderCharacters);
    const reorderLocations = useAppStore((state) => state.reorderLocations);
    const moveLocationInTree = useAppStore((state) => state.moveLocationInTree);
    const reorderOrganizations = useAppStore(
        (state) => state.reorderOrganizations,
    );
    const toggleBinder = useAppStore((state) => state.toggleBinder);
    const isBinderOpen = useAppStore((state) => state.isBinderOpen);

    return (
        <DocumentBinder
            chapters={chapters}
            scrapNotes={scrapNotes}
            characters={characters}
            locations={locations}
            rootLocationIds={rootLocationIds}
            organizations={organizations}
            activeDocument={activeDocument}
            activeKind={activeKind}
            onActiveKindChange={onActiveKindChange}
            showTabbar={showTabbar}
            onSelect={setActiveDocument}
            onCreateChapter={createChapterEntry}
            onCreateScrapNote={createScrapNoteEntry}
            onCreateCharacter={createCharacterEntry}
            onCreateLocation={createLocationEntry}
            onCreateOrganization={createOrganizationEntry}
            onDeleteChapter={deleteChapter}
            onDeleteScrapNote={deleteScrapNote}
            onDeleteCharacter={deleteCharacter}
            onDeleteLocation={deleteLocation}
            onDeleteOrganization={deleteOrganization}
            onReorderChapters={reorderChapters}
            onReorderScrapNotes={reorderScrapNotes}
            onReorderCharacters={reorderCharacters}
            onReorderLocations={reorderLocations}
            onMoveLocation={moveLocationInTree}
            onReorderOrganizations={reorderOrganizations}
            onEditTemplate={onEditTemplate}
            onToggleCollapse={toggleBinder}
            isBinderOpen={isBinderOpen}
        />
    );
};
