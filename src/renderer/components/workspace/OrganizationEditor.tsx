import React from "react";

import type {
    WorkspaceCharacter,
    WorkspaceLocation,
    WorkspaceMetafieldAssignment,
    WorkspaceMetafieldDefinition,
    WorkspaceOrganization,
} from "../../types";
import { type DocumentRef } from "../ui/ListInput";
import {
    SearchableMultiSelect,
    type SelectOption,
} from "../ui/SearchableSelect";
import {
    RichEditor,
    type RichEditorCardConfig,
    type RichEditorCustomCard,
    type RichEditorRenderContext,
} from "./RichEditor";

export type OrganizationEditorValues = {
    name: string;
    description: string;
    locationIds: string[];
};

export type OrganizationEditorProps = {
    projectId: string;
    organization: WorkspaceOrganization;
    locations: WorkspaceLocation[];
    allCharacters: WorkspaceCharacter[];
    allLocations: WorkspaceLocation[];
    allOrganizations: WorkspaceOrganization[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    imageOptions: SelectOption[];
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
    onSubmit: (values: OrganizationEditorValues) => Promise<void>;
    onNavigateToDocument?: (ref: DocumentRef) => void;
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
    }) => Promise<{ definition: WorkspaceMetafieldDefinition }>;
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
    onDirtyStateChange?: (isDirty: boolean) => void;
    focusTitleOnMount?: boolean;
};

const defaultValues = (
    organization: WorkspaceOrganization,
): OrganizationEditorValues => ({
    name: organization.name ?? "",
    description: organization.description ?? "",
    locationIds: organization.locationIds ?? [],
});

const DEFAULT_CARDS: RichEditorCardConfig[] = [
    { title: "Locations", type: "locations" },
];

export const OrganizationEditor: React.FC<OrganizationEditorProps> = ({
    projectId,
    organization,
    locations,
    allCharacters,
    allLocations,
    allOrganizations,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onNavigateToDocument,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    onCreateOrReuseMetafieldDefinition,
    onAssignMetafieldToEntity,
    onSaveMetafieldValue,
    onRemoveMetafieldFromEntity,
    onDeleteMetafieldDefinitionGlobal,
    onImportMetafieldImage,
    onDirtyStateChange,
    focusTitleOnMount = false,
}) => {
    const initialValues = React.useMemo(
        () => defaultValues(organization),
        [organization.name, organization.description, organization.locationIds],
    );

    const runtimeReach = React.useMemo(
        () =>
            locations.filter((location) =>
                (location.organizationIds ?? []).includes(organization.id),
            ).length,
        [locations, organization.id],
    );

    const locationOptions: SelectOption[] = React.useMemo(
        () =>
            locations.map((loc) => ({
                id: loc.id,
                label: loc.name || "Untitled location",
            })),
        [locations],
    );

    const renderDefaultCard = React.useCallback(
        (
            card: RichEditorCardConfig,
            context: RichEditorRenderContext<OrganizationEditorValues>,
        ) => {
            if (card.type === "locations") {
                return (
                    <div className="entity-field">
                        <SearchableMultiSelect
                            value={context.values.locationIds}
                            options={locationOptions}
                            onChange={(ids) =>
                                context.setField("locationIds", ids)
                            }
                            placeholder="Search to add locations..."
                        />
                    </div>
                );
            }

            return null;
        },
        [locationOptions],
    );

    const customCards = React.useMemo<
        RichEditorCustomCard<OrganizationEditorValues>[]
    >(
        () => [
            {
                title: "Reach",
                type: "reach",
                render: () => (
                    <div className="entity-summary">
                        <div>
                            <span className="summary-label">Reach</span>
                            <span className="summary-value">
                                {runtimeReach} locations
                            </span>
                        </div>
                    </div>
                ),
            },
        ],
        [organization.galleryImageIds.length, runtimeReach],
    );

    return (
        <RichEditor<OrganizationEditorValues>
            panelLabel="Organization"
            projectId={projectId}
            entityType="organization"
            entityId={organization.id}
            initialValues={initialValues}
            defaultCards={DEFAULT_CARDS}
            customCards={customCards}
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
            onAssignMetafieldToEntity={onAssignMetafieldToEntity}
            onSaveMetafieldValue={onSaveMetafieldValue}
            onRemoveMetafieldFromEntity={onRemoveMetafieldFromEntity}
            onDeleteMetafieldDefinitionGlobal={
                onDeleteMetafieldDefinitionGlobal
            }
            onImportMetafieldImage={onImportMetafieldImage}
            onDirtyStateChange={onDirtyStateChange}
            focusTitleOnMount={focusTitleOnMount}
            assetText={{
                noImageLabel: "No crest yet",
                generateImageLabel: "Generate crest",
                imageGenerateError: "Failed to generate crest.",
                imageImportError: "Failed to import crest.",
            }}
        />
    );
};
