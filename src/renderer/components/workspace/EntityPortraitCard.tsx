import React from "react";

import { ActionDropdown } from "../ui/ActionDropdown";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons";

export type PortraitImage = {
    id: string;
    url: string;
};

type EntityPortraitCardProps = {
    images: PortraitImage[];
    placeholder: string;
    generateLabel: string;
    onGenerate: () => Promise<void>;
    onImport: (file: File) => Promise<void>;
    onDeleteImage: (imageId: string) => Promise<void>;
    assetBusy: boolean;
};

export const EntityPortraitCard: React.FC<EntityPortraitCardProps> = ({
    images,
    placeholder,
    generateLabel,
    onGenerate,
    onImport,
    assetBusy,
}) => {
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!images.length) {
            firstImageRef.current = undefined;
            setCurrentImageIndex(0);
            return;
        }

        const currentFirst = images[0]?.id;
        const previousFirst = firstImageRef.current;
        firstImageRef.current = currentFirst;

        setCurrentImageIndex((prev) => {
            if (!images.length) {
                return 0;
            }
            if (currentFirst && currentFirst !== previousFirst) {
                return 0;
            }
            if (prev >= images.length) {
                return images.length - 1;
            }
            return prev;
        });
    }, [images]);

    const canCycleGallery = images.length > 1;
    const currentImage = images[currentImageIndex];

    const triggerFilePick = () => {
        fileInputRef.current?.click();
    };

    const showNextImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const showPreviousImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex(
            (prev) => (prev - 1 + images.length) % images.length,
        );
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            await onImport(file);
        } finally {
            event.target.value = "";
        }
    };

    return (
        <div className="portrait-card">
            <div
                className={
                    "portrait-frame" + (currentImage ? " has-image" : "")
                }
            >
                {!currentImage ? (
                    <span className="portrait-placeholder">{placeholder}</span>
                ) : (
                    <img
                        src={currentImage.url}
                        alt=""
                        className="portrait-frame-image"
                        draggable={false}
                    />
                )}
            </div>
            <div className="portrait-toolbar">
                <div className="portrait-gallery-nav">
                    <button
                        type="button"
                        className="gallery-nav-btn"
                        onClick={showPreviousImage}
                        disabled={!canCycleGallery}
                    >
                        <ChevronLeftIcon size={14} />
                    </button>
                    <span className="gallery-nav-label">
                        {images.length > 0
                            ? `${currentImageIndex + 1} of ${images.length}`
                            : "0 of 0"}
                    </span>
                    <button
                        type="button"
                        className="gallery-nav-btn"
                        onClick={showNextImage}
                        disabled={!canCycleGallery}
                    >
                        <ChevronRightIcon size={14} />
                    </button>
                </div>
                <ActionDropdown
                    disabled={assetBusy}
                    options={[
                        {
                            label: "Import image",
                            onClick: triggerFilePick,
                            disabled: assetBusy,
                        },
                        {
                            label: generateLabel,
                            onClick: onGenerate,
                            disabled: assetBusy,
                        },
                    ]}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};
