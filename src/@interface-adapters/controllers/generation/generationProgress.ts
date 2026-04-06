export type GenerationOutputType = "audio" | "image";

export type GenerationProgressPayload = {
    type: GenerationOutputType;
    progress: number;
    statusText?: string;
};

type ProgressSender = {
    send: (
        channel: "generation-progress",
        payload: GenerationProgressPayload,
    ) => void;
};

type WarmupStage = {
    delayMs: number;
    statusText: string;
};

const WARMUP_STAGES: WarmupStage[] = [
    { delayMs: 0, statusText: "Warming up..." },
    { delayMs: 350, statusText: "Initializing..." },
    { delayMs: 850, statusText: "Starting generation..." },
];

export const createGenerationProgressRelay = (
    sender: ProgressSender,
    type: GenerationOutputType,
) => {
    const warmupTimers: Array<ReturnType<typeof setTimeout>> = [];
    let warmupStopped = false;
    let hasReceivedGenerationProgress = false;

    const send = (payload: Omit<GenerationProgressPayload, "type">): void => {
        sender.send("generation-progress", {
            type,
            ...payload,
        });
    };

    const stopWarmup = (): void => {
        if (warmupStopped) {
            return;
        }

        warmupStopped = true;
        for (const timer of warmupTimers) {
            clearTimeout(timer);
        }
        warmupTimers.length = 0;
    };

    const startWarmup = (): void => {
        for (const stage of WARMUP_STAGES) {
            const timer = setTimeout(() => {
                if (warmupStopped || hasReceivedGenerationProgress) {
                    return;
                }

                send({
                    progress: 0,
                    statusText: stage.statusText,
                });
            }, stage.delayMs);

            warmupTimers.push(timer);
        }
    };

    const onProgress = (progress: number): void => {
        if (!hasReceivedGenerationProgress) {
            hasReceivedGenerationProgress = true;
            stopWarmup();
        }

        send({ progress });
    };

    return {
        onProgress,
        startWarmup,
        stopWarmup,
    };
};
