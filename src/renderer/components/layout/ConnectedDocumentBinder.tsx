import React from "react";
import { useAppStore } from "../../state/appStore";
import { DocumentBinder } from "../workspace/DocumentBinder";

export const ConnectedDocumentBinder: React.FC = () => {
    const store = useAppStore();

    return (
        <DocumentBinder
            chapters={store.chapters}
            scrapNotes={store.scrapNotes}
            characters={store.characters}
            locations={store.locations}
            organizations={store.organizations}
            activeDocument={store.activeDocument}
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
        />
    );
};
