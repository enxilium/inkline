import React from "react";

export const LoadingView: React.FC = () => (
    <section className="loading-view" style={{ textAlign: "center", gap: "1rem" }}>
        <p className="panel-label">Preparing workspace</p>
        <h2>Loading your session…</h2>
        <p className="panel-subtitle">
            Checking for saved credentials so you can jump straight in.
        </p>
    </section>
);
