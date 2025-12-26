import React, { useEffect, useState } from "react";

export const GenerationProgressToast: React.FC = () => {
    const [progress, setProgress] = useState<{
        type: string;
        progress: number;
    } | null>(null);

    useEffect(() => {
        const unsubscribe = window.generationEvents.onProgress((payload) => {
            setProgress(payload);
            if (payload.progress >= 100) {
                setTimeout(() => setProgress(null), 2000);
            }
        });
        return () => {
            unsubscribe();
        };
    }, []);

    if (!progress) return null;

    return (
        <div className="generation-progress-toast">
            <div className="generation-progress-label">
                Generating {progress.type}...
            </div>
            <div className="generation-progress-bar">
                <div
                    className="generation-progress-fill"
                    style={{ width: `${progress.progress}%` }}
                />
            </div>
        </div>
    );
};
