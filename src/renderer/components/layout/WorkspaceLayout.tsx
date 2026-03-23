import React from "react";
import {
    Layout,
    Model,
    TabNode,
    IJsonModel,
    Actions,
    DockLocation,
} from "flexlayout-react";

import { useAppStore } from "../../state/appStore";
import { ConnectedTextEditor } from "./ConnectedTextEditor";
import { ConnectedCharacterEditor } from "./ConnectedCharacterEditor";
import { ConnectedLocationEditor } from "./ConnectedLocationEditor";
import { ConnectedOrganizationEditor } from "./ConnectedOrganizationEditor";

const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
        tabSetEnableMaximize: false,
        splitterSize: 3,
    },
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "tabset",
                weight: 100,
                id: "main-tabset",
                enableDeleteWhenEmpty: true,
                children: [],
            },
        ],
    },
};

export type LayoutSummary = {
    signature: string;
    tabsetCount: number;
};

const summarizeLayout = (model: Model): LayoutSummary => {
    const json = model.toJson();

    const countTabsets = (node: unknown): number => {
        if (!node || typeof node !== "object") {
            return 0;
        }

        const typed = node as {
            type?: string;
            children?: unknown[];
        };
        const own: number = typed.type === "tabset" ? 1 : 0;
        const children = Array.isArray(typed.children) ? typed.children : [];
        return (
            own +
            children.reduce<number>((sum, child) => {
                return sum + countTabsets(child);
            }, 0)
        );
    };

    const layout = (json as { layout?: unknown }).layout ?? {};

    return {
        signature: JSON.stringify(layout),
        tabsetCount: countTabsets(layout),
    };
};

export const WorkspaceLayout: React.FC<{
    onLayoutSummaryChange?: (summary: LayoutSummary) => void;
}> = ({ onLayoutSummaryChange }) => {
    const {
        activeDocument,
        setActiveDocument,
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
    } = useAppStore();

    // Initialize model once
    const [model] = React.useState(() => Model.fromJson(defaultLayout));

    React.useEffect(() => {
        if (!onLayoutSummaryChange) {
            return;
        }

        onLayoutSummaryChange(summarizeLayout(model));
    }, [model, onLayoutSummaryChange]);

    // Factory to render components
    const factory = (node: TabNode) => {
        const component = node.getComponent();
        const config = node.getConfig();

        if (component === "editor" && config) {
            const { id, kind } = config;
            if (kind === "chapter" || kind === "scrapNote") {
                return <ConnectedTextEditor documentId={id} kind={kind} />;
            }
            if (kind === "character") {
                return <ConnectedCharacterEditor characterId={id} />;
            }
            if (kind === "location") {
                return <ConnectedLocationEditor locationId={id} />;
            }
            if (kind === "organization") {
                return <ConnectedOrganizationEditor organizationId={id} />;
            }
        }

        return (
            <div className="empty-editor">
                Please add a document to begin editing.
            </div>
        );
    };

    // Sync: Store Data -> Layout Tab Names
    React.useEffect(() => {
        const entityExists = (kind: string, id: string): boolean => {
            if (kind === "chapter") {
                return chapters.some((c) => c.id === id);
            }
            if (kind === "scrapNote") {
                return scrapNotes.some((n) => n.id === id);
            }
            if (kind === "character") {
                return characters.some((c) => c.id === id);
            }
            if (kind === "location") {
                return locations.some((l) => l.id === id);
            }
            if (kind === "organization") {
                return organizations.some((o) => o.id === id);
            }
            return false;
        };

        model.visitNodes((node) => {
            if (node.getType() === "tab") {
                const tabNode = node as TabNode;
                if (tabNode.getComponent() === "editor") {
                    const config = tabNode.getConfig();
                    if (config && config.id && config.kind) {
                        if (!entityExists(config.kind, config.id)) {
                            model.doAction(Actions.deleteTab(tabNode.getId()));
                            return;
                        }

                        let newName = "";
                        if (config.kind === "chapter") {
                            newName =
                                chapters.find((c) => c.id === config.id)
                                    ?.title || "Chapter";
                        } else if (config.kind === "scrapNote") {
                            newName =
                                scrapNotes.find((n) => n.id === config.id)
                                    ?.title || "Note";
                        } else if (config.kind === "character") {
                            newName =
                                characters.find((c) => c.id === config.id)
                                    ?.name || "Character";
                        } else if (config.kind === "location") {
                            newName =
                                locations.find((l) => l.id === config.id)
                                    ?.name || "Location";
                        } else if (config.kind === "organization") {
                            newName =
                                organizations.find((o) => o.id === config.id)
                                    ?.name || "Organization";
                        }

                        if (newName && tabNode.getName() !== newName) {
                            model.doAction(
                                Actions.renameTab(tabNode.getId(), newName),
                            );
                        }
                    }
                }
            }
        });
    }, [model, chapters, scrapNotes, characters, locations, organizations]);

    // Sync: Store -> Layout
    React.useEffect(() => {
        if (!activeDocument) return;

        const nodeId = `${activeDocument.kind}:${activeDocument.id}`;
        const existingNode = model.getNodeById(nodeId);

        if (existingNode) {
            // If already open, just select it
            model.doAction(Actions.selectTab(nodeId));
        } else {
            // If not open, add it
            let name = "Untitled";
            if (activeDocument.kind === "chapter") {
                name =
                    chapters.find((c) => c.id === activeDocument.id)?.title ||
                    "Chapter";
            } else if (activeDocument.kind === "scrapNote") {
                name =
                    scrapNotes.find((n) => n.id === activeDocument.id)?.title ||
                    "Note";
            } else if (activeDocument.kind === "character") {
                name =
                    characters.find((c) => c.id === activeDocument.id)?.name ||
                    "Character";
            } else if (activeDocument.kind === "location") {
                name =
                    locations.find((l) => l.id === activeDocument.id)?.name ||
                    "Location";
            } else if (activeDocument.kind === "organization") {
                name =
                    organizations.find((o) => o.id === activeDocument.id)
                        ?.name || "Organization";
            }

            let targetNodeId = "main-tabset";
            const location = DockLocation.CENTER;
            let bestTargetFound = false;

            const activeTabset = model.getActiveTabset();
            const mainTabset = model.getNodeById("main-tabset");

            // 1. Try Active Tabset
            if (activeTabset) {
                targetNodeId = activeTabset.getId();
                bestTargetFound = true;
            }
            // 2. Try Main Tabset (if it still exists)
            else if (mainTabset) {
                targetNodeId = "main-tabset";
                bestTargetFound = true;
            }
            // 3. Try to find any other content tabset
            else {
                const root = model.getRoot();
                const children = root.getChildren();
                for (const child of children) {
                    if (child.getType() === "tabset") {
                        targetNodeId = child.getId();
                        bestTargetFound = true;
                        break;
                    }
                }
            }

            // 4. Fallback: Create new split
            if (!bestTargetFound) {
                // If no tabsets exist, we might need to recreate one or add to root
                // But FlexLayout usually keeps at least one if we configure it right
                // For now, assume main-tabset or active one works.
            }

            model.doAction(
                Actions.addNode(
                    {
                        type: "tab",
                        component: "editor",
                        name,
                        id: nodeId,
                        config: {
                            id: activeDocument.id,
                            kind: activeDocument.kind,
                        },
                    },
                    targetNodeId,
                    location,
                    -1,
                ),
            );
        }
    }, [
        activeDocument,
        model,
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
    ]);

    // Sync: Layout -> Store
    const onModelChange = (model: Model) => {
        onLayoutSummaryChange?.(summarizeLayout(model));
        const activeTab = model.getActiveTabset()?.getSelectedNode() as TabNode;
        if (activeTab) {
            const config = activeTab.getConfig();
            if (config && config.id && config.kind) {
                // Only update store if it's different to avoid loops
                // We check if the store's active document is different
                const current = useAppStore.getState().activeDocument;
                if (
                    !current ||
                    current.id !== config.id ||
                    current.kind !== config.kind
                ) {
                    setActiveDocument({ id: config.id, kind: config.kind });
                }
            }
        }
    };

    const onExternalDrag = () => {
        const draggedDoc = useAppStore.getState().draggedDocument;
        if (draggedDoc) {
            const nodeId = `${draggedDoc.kind}:${draggedDoc.id}`;
            // Prevent duplicate tabs by checking if the node already exists
            if (model.getNodeById(nodeId)) {
                return undefined;
            }

            return {
                dragText: draggedDoc.title,
                json: {
                    type: "tab",
                    component: "editor",
                    name: draggedDoc.title,
                    id: nodeId,
                    config: { id: draggedDoc.id, kind: draggedDoc.kind },
                },
            };
        }
        return undefined;
    };

    return (
        <div
            className="workspace-shell"
            data-tutorial-id="workspace-layout-root"
        >
            <Layout
                model={model}
                factory={factory}
                onModelChange={onModelChange}
                onExternalDrag={onExternalDrag}
                realtimeResize={true}
            />
        </div>
    );
};
