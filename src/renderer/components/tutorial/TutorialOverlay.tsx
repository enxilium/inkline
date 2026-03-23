import React from "react";

import inkyIcon from "../../../../assets/icons/inky.png";
import { Button } from "../ui/Button";
import type { TutorialStep } from "./tutorialSteps";

type TutorialOverlayProps = {
    step: TutorialStep;
    stepIndex: number;
    totalSteps: number;
    showNext: boolean;
    onNext: () => void;
    onSkip: () => void;
};

type RectLike = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const TARGET_PADDING = 8;

const measureTarget = (targetId: string): RectLike | null => {
    const element = document.querySelector(
        `[data-tutorial-id="${targetId}"]`,
    ) as HTMLElement | null;
    if (!element) {
        return null;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        top: Math.max(0, rect.top - TARGET_PADDING),
        left: Math.max(0, rect.left - TARGET_PADDING),
        width: rect.width + TARGET_PADDING * 2,
        height: rect.height + TARGET_PADDING * 2,
    };
};

const clamp = (value: number, min: number, max: number): number => {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
};

const computeCardPosition = (
    targetRect: RectLike | null,
): React.CSSProperties => {
    const cardWidth = Math.min(420, Math.max(300, window.innerWidth - 32));
    const cardHeight = 260;
    const gap = 16;
    const margin = 12;

    if (!targetRect) {
        return {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${cardWidth}px`,
        };
    }

    const targetBottom = targetRect.top + targetRect.height;
    const targetRight = targetRect.left + targetRect.width;

    const fitsBelow =
        targetBottom + gap + cardHeight <= window.innerHeight - margin;
    const fitsAbove = targetRect.top - gap - cardHeight >= margin;

    const preferredTop = fitsBelow
        ? targetBottom + gap
        : fitsAbove
          ? targetRect.top - gap - cardHeight
          : clamp(
                targetBottom + gap,
                margin,
                window.innerHeight - cardHeight - margin,
            );

    const centeredLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    const clampedLeft = clamp(
        centeredLeft,
        margin,
        window.innerWidth - cardWidth - margin,
    );

    if (targetRect.left > window.innerWidth * 0.66) {
        const leftCandidate = targetRect.left - cardWidth - gap;
        if (leftCandidate >= margin) {
            return {
                top: `${clamp(targetRect.top, margin, window.innerHeight - cardHeight - margin)}px`,
                left: `${leftCandidate}px`,
                width: `${cardWidth}px`,
            };
        }
    }

    if (targetRight < window.innerWidth * 0.34) {
        const rightCandidate = targetRight + gap;
        if (rightCandidate + cardWidth <= window.innerWidth - margin) {
            return {
                top: `${clamp(targetRect.top, margin, window.innerHeight - cardHeight - margin)}px`,
                left: `${rightCandidate}px`,
                width: `${cardWidth}px`,
            };
        }
    }

    return {
        top: `${preferredTop}px`,
        left: `${clampedLeft}px`,
        width: `${cardWidth}px`,
    };
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    step,
    stepIndex,
    totalSteps,
    showNext,
    onNext,
    onSkip,
}) => {
    const [targetRect, setTargetRect] = React.useState<RectLike | null>(null);

    React.useEffect(() => {
        let animationFrame: number | null = null;
        const update = () => {
            setTargetRect(measureTarget(step.targetId));
        };

        const scheduleUpdate = () => {
            if (animationFrame !== null) {
                return;
            }
            animationFrame = window.requestAnimationFrame(() => {
                animationFrame = null;
                update();
            });
        };

        const intervalId = window.setInterval(scheduleUpdate, 250);
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("scroll", scheduleUpdate, true);

        const resizeObserver = new ResizeObserver(() => {
            scheduleUpdate();
        });
        resizeObserver.observe(document.body);

        scheduleUpdate();

        return () => {
            if (animationFrame !== null) {
                window.cancelAnimationFrame(animationFrame);
            }
            window.clearInterval(intervalId);
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("scroll", scheduleUpdate, true);
            resizeObserver.disconnect();
        };
    }, [step.targetId]);

    const cardStyle = React.useMemo(
        () => computeCardPosition(targetRect),
        [targetRect],
    );

    return (
        <div className="tutorial-overlay" aria-live="polite">
            <div className="tutorial-overlay-backdrop" />
            {targetRect ? (
                <div
                    className="tutorial-overlay-highlight"
                    style={{
                        top: `${targetRect.top}px`,
                        left: `${targetRect.left}px`,
                        width: `${targetRect.width}px`,
                        height: `${targetRect.height}px`,
                    }}
                />
            ) : null}
            <section className="tutorial-card" style={cardStyle}>
                <header className="tutorial-card-header">
                    <div className="tutorial-card-speaker">
                        <img
                            src={inkyIcon}
                            alt="Inky"
                            className="tutorial-card-avatar"
                        />
                        <div>
                            <p className="tutorial-card-name">Inky</p>
                            <p className="tutorial-card-progress">
                                Step {stepIndex + 1} of {totalSteps}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="tutorial-skip-button"
                        onClick={onSkip}
                    >
                        Skip Tutorial
                    </button>
                </header>

                <p className="tutorial-card-message">{step.message}</p>

                {step.action && !showNext ? (
                    <p className="tutorial-card-action-hint">
                        {step.actionLabel}
                    </p>
                ) : null}

                <div className="tutorial-card-actions">
                    {showNext ? (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={onNext}
                        >
                            Next
                        </Button>
                    ) : null}
                </div>
            </section>
        </div>
    );
};
