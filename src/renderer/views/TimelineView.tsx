import React from "react";
import ConstructionIcon from "@mui/icons-material/Construction";

const TimelineView: React.FC = () => {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.5rem",
                padding: "2rem",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontSize: "4rem",
                    opacity: 0.3,
                }}
            >
                <ConstructionIcon style={{ fontSize: "4rem", opacity: 0.3 }} />
            </div>
            <h1
                style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0,
                }}
            >
                Timeline Coming Soon
            </h1>
            <p
                style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    maxWidth: "400px",
                    lineHeight: 1.6,
                    margin: 0,
                }}
            >
                The timeline feature is currently under development. Check back
                later for an interactive way to visualize and manage your
                story&apos;s events.
            </p>
        </div>
    );
};

export default TimelineView;
