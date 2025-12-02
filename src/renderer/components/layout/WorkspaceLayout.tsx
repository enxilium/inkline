import React from "react";
import { Layout, Model, TabNode, IJsonModel, Actions, DockLocation, TabSetNode } from "flexlayout-react";

import { useAppStore } from "../../state/appStore";
import { ConnectedDocumentBinder } from "./ConnectedDocumentBinder";
import { ConnectedTextEditor } from "./ConnectedTextEditor";
import { ConnectedCharacterEditor } from "./ConnectedCharacterEditor";
import { ConnectedLocationEditor } from "./ConnectedLocationEditor";
import { ConnectedOrganizationEditor } from "./ConnectedOrganizationEditor";
import type { WorkspaceDocumentRef } from "../../types";

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
                weight: 25,
                minWidth: 240,
                maxWidth: 300,
                id: "binder-tabset",
                enableTabStrip: false,
                enableDrop: false,
                enableDrag: false,
                enableDivide: false,
                children: [
                    {
                        type: "tab",
                        name: "Binder",
                        component: "binder",
                        enableClose: false,
                        id: "binder-tab",
                        className: "binder-tab",
                    },
                ],
            },
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

export const WorkspaceLayout: React.FC = () => {
    const { activeDocument, setActiveDocument, chapters, scrapNotes, characters, locations, organizations } = useAppStore();
    
    // Initialize model once
    const [model] = React.useState(() => Model.fromJson(defaultLayout));

    // Factory to render components
    const factory = (node: TabNode) => {
        const component = node.getComponent();
        const config = node.getConfig();

        if (component === "binder") {
            return <ConnectedDocumentBinder />;
        }

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

        return <div className="empty-editor">Please add a document to begin editing.</div>;
    };

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
                name = chapters.find(c => c.id === activeDocument.id)?.title || "Chapter";
            } else if (activeDocument.kind === "scrapNote") {
                name = scrapNotes.find(n => n.id === activeDocument.id)?.title || "Note";
            } else if (activeDocument.kind === "character") {
                name = characters.find(c => c.id === activeDocument.id)?.name || "Character";
            } else if (activeDocument.kind === "location") {
                name = locations.find(l => l.id === activeDocument.id)?.name || "Location";
            } else if (activeDocument.kind === "organization") {
                name = organizations.find(o => o.id === activeDocument.id)?.name || "Organization";
            }

            let targetNodeId = "main-tabset";
            let location = DockLocation.CENTER;
            let bestTargetFound = false;

            const activeTabset = model.getActiveTabset();
            const mainTabset = model.getNodeById("main-tabset");

            // 1. Try Active Tabset (if not binder)
            if (activeTabset && activeTabset.getId() !== "binder-tabset") {
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
                    if (child.getType() === "tabset" && child.getId() !== "binder-tabset") {
                        targetNodeId = child.getId();
                        bestTargetFound = true;
                        break;
                    }
                }
            }

            // 4. Fallback: Create new split to the right of Binder
            if (!bestTargetFound) {
                targetNodeId = "binder-tabset";
                location = DockLocation.RIGHT;
            }

            model.doAction(
                Actions.addNode(
                    {
                        type: "tab",
                        component: "editor",
                        name,
                        id: nodeId,
                        config: { id: activeDocument.id, kind: activeDocument.kind },
                    },
                    targetNodeId,
                    location,
                    -1
                )
            );
        }
    }, [activeDocument, model, chapters, scrapNotes, characters, locations, organizations]);

    // Sync: Layout -> Store
    const onModelChange = (model: Model) => {
        const activeTab = model.getActiveTabset()?.getSelectedNode() as TabNode;
        if (activeTab) {
            const config = activeTab.getConfig();
            if (config && config.id && config.kind) {
                // Only update store if it's different to avoid loops
                // We check if the store's active document is different
                const current = useAppStore.getState().activeDocument;
                if (!current || current.id !== config.id || current.kind !== config.kind) {
                     setActiveDocument({ id: config.id, kind: config.kind });
                }
            }
        }
    };

    const onExternalDrag = (e: React.DragEvent) => {
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
                }
            };
        }
        return undefined;
    };

    return (
        <div className="workspace-shell" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
