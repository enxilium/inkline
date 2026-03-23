import React from "react";

import type {
    WorkspaceCharacter,
    WorkspaceEditorTemplate,
    WorkspaceLocation,
    WorkspaceMetafieldAssignment,
    WorkspaceMetafieldDefinition,
    WorkspaceOrganization,
} from "../../types";
import { RichTextAreaInput } from "../ui/RichTextAreaInput";
import { SearchableSelect, type SelectOption } from "../ui/SearchableSelect";
import { type DocumentRef } from "../ui/ListInput";
import {
    RichEditor,
    type RichEditorActionLog,
    type RichEditorCardConfig,
    type RichEditorRenderContext,
    type RichEditorSectionPlacement,
} from "./RichEditor";

export type CharacterEditorValues = {
    name: string;
    description: string;
    currentLocationId: string;
    backgroundLocationId: string;
    organizationId: string;
};

export type CharacterEditorActionLog = RichEditorActionLog;
export type CharacterSectionPlacement = RichEditorSectionPlacement;

export type CharacterEditorProps = {
    projectId: string;
    character: WorkspaceCharacter;
    locations: WorkspaceLocation[];
    organizations: WorkspaceOrganization[];
    allCharacters: WorkspaceCharacter[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    imageOptions: SelectOption[];
    galleryImageIds: string[];
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
    onSubmit: (values: CharacterEditorValues) => Promise<void>;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onDeletePortrait: (imageId: string) => Promise<void>;
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
    onActionLog?: (entry: CharacterEditorActionLog) => Promise<void>;
    onSectionLayoutSync?: (layout: CharacterSectionPlacement) => Promise<void>;
    initialSectionPlacement?: CharacterSectionPlacement;
    onDirtyStateChange?: (isDirty: boolean) => void;
    onNavigateToDocument?: (ref: DocumentRef) => void;
    focusTitleOnMount?: boolean;
};

const DEFAULT_CARDS: RichEditorCardConfig[] = [
    { title: "Related Locations", type: "relatedLocations" },
    { title: "Related Organizations", type: "relatedOrganizations" },
];

const defaultValues = (
    character: WorkspaceCharacter,
): CharacterEditorValues => ({
    name: character.name ?? "",
    description: character.description ?? "",
    currentLocationId: character.currentLocationId ?? "",
    backgroundLocationId: character.backgroundLocationId ?? "",
    organizationId: character.organizationId ?? "",
});

export const CharacterEditor: React.FC<CharacterEditorProps> = ({
    projectId,
    character,
    locations,
    organizations,
    allCharacters,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    galleryImageIds,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onGeneratePortrait,
    onImportPortrait,
    onDeletePortrait,
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
    onActionLog,
    onSectionLayoutSync,
    initialSectionPlacement,
    onDirtyStateChange,
    onNavigateToDocument,
    focusTitleOnMount = false,
}) => {
    const initialValues = React.useMemo(
        () => defaultValues(character),
        [
            character.name,
            character.description,
            character.currentLocationId,
            character.backgroundLocationId,
            character.organizationId,
        ],
    );

    const locationOptions: SelectOption[] = React.useMemo(
        () =>
            locations.map((item) => ({
                id: item.id,
                label: item.name || "Untitled location",
            })),
        [locations],
    );

    const organizationOptions: SelectOption[] = React.useMemo(
        () =>
            organizations.map((item) => ({
                id: item.id,
                label: item.name || "Untitled organization",
            })),
        [organizations],
    );

    const renderDefaultCard = React.useCallback(
        (
            card: RichEditorCardConfig,
            context: RichEditorRenderContext<CharacterEditorValues>,
        ) => {
            if (card.type === "relatedLocations") {
                return (
                    <div className="entity-field">
                        <div className="entity-row">
                            <div className="entity-field">
                                <SearchableSelect
                                    value={context.values.currentLocationId}
                                    options={locationOptions}
                                    onChange={(value) =>
                                        context.setField("currentLocationId", value)
                                    }
                                    placeholder="Select current location"
                                    allowClear
                                />
                            </div>
                            <div className="entity-field">
                                <SearchableSelect
                                    value={context.values.backgroundLocationId}
                                    options={locationOptions}
                                    onChange={(value) =>
                                        context.setField("backgroundLocationId", value)
                                    }
                                    placeholder="Select background location"
                                    allowClear
                                />
                            </div>
                        </div>
                    </div>
                );
            }

            if (card.type === "relatedOrganizations") {
                return (
                    <div className="entity-field">
                        <SearchableSelect
                            value={context.values.organizationId}
                            options={organizationOptions}
                            onChange={(value) =>
                                context.setField("organizationId", value)
                            }
                            placeholder="Select organization"
                            allowClear
                        />
                    </div>
                );
            }

            return (
                <div className="entity-field">
                    <RichTextAreaInput
                        id={`character-${card.type}`}
                        rows={3}
                        value=""
                        onChange={() => undefined}
                        placeholder=""
                        availableDocuments={context.availableDocuments}
                        onReferenceClick={context.onNavigateToDocument}
                    />
                </div>
            );
        },
        [locationOptions, organizationOptions],
    );

    return (
        <RichEditor<CharacterEditorValues>
            panelLabel="Character"
            projectId={projectId}
            entityType="character"
            entityId={character.id}
            initialValues={initialValues}
            defaultCards={DEFAULT_CARDS}
            renderDefaultCard={renderDefaultCard}
            onSubmit={onSubmit}
            allCharacters={allCharacters}
            allLocations={locations}
            allOrganizations={organizations}
            metafieldDefinitions={metafieldDefinitions}
            metafieldAssignments={metafieldAssignments}
            imageOptions={imageOptions}
            galleryImageIds={galleryImageIds}
            gallerySources={gallerySources}
            songUrl={songUrl}
            availableDocuments={availableDocuments}
            onNavigateToDocument={onNavigateToDocument}
            onGeneratePortrait={onGeneratePortrait}
            onImportPortrait={onImportPortrait}
            onDeletePortrait={onDeletePortrait}
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
            defaultRightCardTypes={["relatedLocations", "relatedOrganizations"]}
            onActionLog={onActionLog}
            onSectionLayoutSync={onSectionLayoutSync}
            initialSectionPlacement={initialSectionPlacement}
            onDirtyStateChange={onDirtyStateChange}
            focusTitleOnMount={focusTitleOnMount}
            assetText={{
                noImageLabel: "No portrait yet",
                generateImageLabel: "Generate portrait",
                imageGenerateError: "Failed to generate portrait.",
                imageImportError: "Failed to import portrait.",
            }}
        />
    );
};
