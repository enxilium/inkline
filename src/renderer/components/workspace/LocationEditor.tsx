import React from "react";

import type {
    WorkspaceCharacter,
    WorkspaceEditorTemplate,
    WorkspaceLocation,
    WorkspaceMetafieldAssignment,
    WorkspaceMetafieldDefinition,
    WorkspaceOrganization,
} from "../../types";
import { type DocumentRef } from "../ui/ListInput";
import { RichEditor, type RichEditorCustomCard } from "./RichEditor";

export type LocationEditorValues = {
    name: string;
    parentLocationId: string;
    description: string;
};

export type LocationEditorProps = {
    projectId: string;
    location: WorkspaceLocation;
    allCharacters: WorkspaceCharacter[];
    allLocations: WorkspaceLocation[];
    allOrganizations: WorkspaceOrganization[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    imageOptions: { id: string; label: string }[];
    currentParentLocationId: string | null;
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
    onSubmit: (values: LocationEditorValues) => Promise<void>;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
    onCreateOrReuseMetafieldDefinition: (request: {
        projectId: string;
        name: string;
        scope: "character" | "location" | "organization" | "project";
        valueType:
            | "string"
            | "string[]"
            | "entity"
            | "entity[]"
            | "image"
            | "image[]";
        targetEntityKind?: "character" | "location" | "organization";
        selectOptions?: Array<
            | string
            | {
                  label: string;
                  icon?: string | null;
              }
        >;
    }) => Promise<{ definition: WorkspaceMetafieldDefinition }>;
    onSaveMetafieldSelectOptions: (request: {
        definitionId: string;
        options: Array<{ id?: string; label: string; icon?: string | null }>;
    }) => Promise<{
        definitionId: string;
        options: Array<{ id: string; label: string; icon?: string }>;
    }>;
    onAssignMetafieldToEntity: (request: {
        definitionId: string;
        entityType: "character" | "location" | "organization";
        entityId: string;
    }) => Promise<{ assignment: WorkspaceMetafieldAssignment }>;
    onSaveMetafieldValue: (request: {
        assignmentId: string;
        value?: unknown;
        orderIndex?: number;
    }) => Promise<void>;
    onRemoveMetafieldFromEntity: (request: {
        definitionId: string;
        entityType: "character" | "location" | "organization";
        entityId: string;
    }) => Promise<void>;
    onDeleteMetafieldDefinitionGlobal: (request: {
        definitionId: string;
    }) => Promise<void>;
    onImportMetafieldImage: (file: File) => Promise<string>;
    editorTemplate?: WorkspaceEditorTemplate | null;
    onDirtyStateChange?: (isDirty: boolean) => void;
    onNavigateToDocument?: (ref: DocumentRef) => void;
    focusTitleOnMount?: boolean;
};

const defaultValues = (
    location: WorkspaceLocation,
    currentParentLocationId: string | null,
): LocationEditorValues => ({
    name: location.name ?? "",
    parentLocationId: currentParentLocationId ?? "",
    description: location.description ?? "",
});

export const LocationEditor: React.FC<LocationEditorProps> = ({
    projectId,
    location,
    allCharacters,
    allLocations,
    allOrganizations,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    currentParentLocationId,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    onCreateOrReuseMetafieldDefinition,
    onSaveMetafieldSelectOptions,
    onAssignMetafieldToEntity,
    onSaveMetafieldValue,
    onRemoveMetafieldFromEntity,
    onDeleteMetafieldDefinitionGlobal,
    onImportMetafieldImage,
    editorTemplate,
    onDirtyStateChange,
    onNavigateToDocument,
    focusTitleOnMount = false,
}) => {
    const initialValues = React.useMemo(
        () => defaultValues(location, currentParentLocationId),
        [location, currentParentLocationId],
    );

    const runtimeCharactersPresent = React.useMemo(
        () =>
            allCharacters.filter(
                (character) =>
                    character.currentLocationId === location.id ||
                    character.backgroundLocationId === location.id,
            ).length,
        [allCharacters, location.id],
    );

    const runtimeOrganizationsPresent = React.useMemo(
        () =>
            allOrganizations.filter((organization) =>
                (organization.locationIds ?? []).includes(location.id),
            ).length,
        [allOrganizations, location.id],
    );

    const customCards = React.useMemo<
        RichEditorCustomCard<LocationEditorValues>[]
    >(
        () => [
            {
                title: "Presence",
                type: "presence",
                render: () => (
                    <div className="entity-summary">
                        <div>
                            <span className="summary-label">
                                Characters present
                            </span>
                            <span className="summary-value">
                                {runtimeCharactersPresent}
                            </span>
                        </div>
                        <div>
                            <span className="summary-label">
                                Organizations present
                            </span>
                            <span className="summary-value">
                                {runtimeOrganizationsPresent}
                            </span>
                        </div>
                    </div>
                ),
            },
        ],
        [runtimeCharactersPresent, runtimeOrganizationsPresent],
    );

    const renderDefaultCard = React.useCallback(
        (): React.ReactNode => null,
        [],
    );

    return (
        <RichEditor<LocationEditorValues>
            panelLabel="Location"
            projectId={projectId}
            entityType="location"
            entityId={location.id}
            initialValues={initialValues}
            defaultCards={[]}
            customCards={customCards}
            customRightCardTypes={["presence"]}
            renderDefaultCard={renderDefaultCard}
            onSubmit={onSubmit}
            allCharacters={allCharacters}
            allLocations={allLocations}
            allOrganizations={allOrganizations}
            metafieldDefinitions={metafieldDefinitions}
            metafieldAssignments={metafieldAssignments}
            imageOptions={imageOptions}
            gallerySources={gallerySources}
            songUrl={songUrl}
            availableDocuments={availableDocuments}
            onNavigateToDocument={onNavigateToDocument}
            onGeneratePortrait={onGeneratePortrait}
            onImportPortrait={onImportPortrait}
            onGenerateSong={onGenerateSong}
            onImportSong={onImportSong}
            onGeneratePlaylist={onGeneratePlaylist}
            onImportPlaylist={onImportPlaylist}
            onCreateOrReuseMetafieldDefinition={
                onCreateOrReuseMetafieldDefinition
            }
            onSaveMetafieldSelectOptions={onSaveMetafieldSelectOptions}
            onAssignMetafieldToEntity={onAssignMetafieldToEntity}
            onSaveMetafieldValue={onSaveMetafieldValue}
            onRemoveMetafieldFromEntity={onRemoveMetafieldFromEntity}
            onDeleteMetafieldDefinitionGlobal={
                onDeleteMetafieldDefinitionGlobal
            }
            onImportMetafieldImage={onImportMetafieldImage}
            editorTemplate={editorTemplate}
            onDirtyStateChange={onDirtyStateChange}
            focusTitleOnMount={focusTitleOnMount}
            assetText={{
                noImageLabel: "No art yet",
                generateImageLabel: "Generate art",
                imageGenerateError: "Failed to generate artwork.",
                imageImportError: "Failed to import artwork.",
            }}
        />
    );
};
