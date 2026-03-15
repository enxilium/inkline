import React from "react";
import Cropper from "react-easy-crop";

import { ActionDropdown } from "../ui/ActionDropdown";
import { Button } from "../ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons";

export type ImageCrop = {
    x: number;
    y: number;
    zoom: number;
    area?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};

export type GalleryImageCropMap = Record<string, ImageCrop>;

export type PortraitImage = {
    id: string;
    url: string;
};

type EntityPortraitCardProps = {
    images: PortraitImage[];
    placeholder: string;
    generateLabel: string;
    cropMap: GalleryImageCropMap;
    onCropMapChange: (nextMap: GalleryImageCropMap) => void;
    onGenerate: () => Promise<void>;
    onImport: (file: File) => Promise<void>;
    onDeleteImage: (imageId: string) => Promise<void>;
    assetBusy: boolean;
};

const DEFAULT_CROP: ImageCrop = {
    x: 0,
    y: 0,
    zoom: 1,
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load image."));
        image.src = src;
    });

const clampPercent = (value: number): number =>
    Math.min(Math.max(value, 0), 100);

const sanitizeCropArea = (
    area:
        | { x?: unknown; y?: unknown; width?: unknown; height?: unknown }
        | undefined,
): ImageCrop["area"] => {
    if (!area) {
        return undefined;
    }

    const x = typeof area.x === "number" ? clampPercent(area.x) : NaN;
    const y = typeof area.y === "number" ? clampPercent(area.y) : NaN;
    const width =
        typeof area.width === "number" ? clampPercent(area.width) : NaN;
    const height =
        typeof area.height === "number" ? clampPercent(area.height) : NaN;

    if (
        Number.isNaN(x) ||
        Number.isNaN(y) ||
        Number.isNaN(width) ||
        Number.isNaN(height) ||
        width <= 0 ||
        height <= 0
    ) {
        return undefined;
    }

    return { x, y, width, height };
};

const createCroppedImageUrl = async (
    imageSrc: string,
    area: NonNullable<ImageCrop["area"]>,
): Promise<string> => {
    const image = await loadImage(imageSrc);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    const sx = (area.x / 100) * sourceWidth;
    const sy = (area.y / 100) * sourceHeight;
    const sw = Math.max(1, (area.width / 100) * sourceWidth);
    const sh = Math.max(1, (area.height / 100) * sourceHeight);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Failed to create crop canvas context.");
    }

    context.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) {
                resolve(result);
                return;
            }
            reject(new Error("Failed to create cropped image."));
        });
    });

    return URL.createObjectURL(blob);
};

const sanitizeCrop = (crop: ImageCrop | undefined): ImageCrop => {
    if (!crop) {
        return DEFAULT_CROP;
    }

    const zoom =
        typeof crop.zoom === "number" && Number.isFinite(crop.zoom)
            ? Math.min(Math.max(crop.zoom, MIN_ZOOM), MAX_ZOOM)
            : MIN_ZOOM;

    const x =
        typeof crop.x === "number" && Number.isFinite(crop.x) ? crop.x : 0;
    const y =
        typeof crop.y === "number" && Number.isFinite(crop.y) ? crop.y : 0;
    const area = sanitizeCropArea(crop.area);
    return { x, y, zoom, area };
};

const NO_OP = () => {};

export const EntityPortraitCard: React.FC<EntityPortraitCardProps> = ({
    images,
    placeholder,
    generateLabel,
    cropMap,
    onCropMapChange,
    onGenerate,
    onImport,
    onDeleteImage,
    assetBusy,
}) => {
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isEditingCrop, setIsEditingCrop] = React.useState(false);
    const [draftCrop, setDraftCrop] = React.useState({ x: 0, y: 0 });
    const [draftZoom, setDraftZoom] = React.useState(MIN_ZOOM);
    const [draftArea, setDraftArea] = React.useState<ImageCrop["area"]>();
    const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(
        null,
    );
    const [currentImageAspect, setCurrentImageAspect] = React.useState<
        number | null
    >(null);

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
    const currentImageId = currentImage?.id;
    const currentCrop = sanitizeCrop(
        currentImage ? cropMap[currentImage.id] : DEFAULT_CROP,
    );

    React.useEffect(
        () => () => {
            if (previewImageUrl) {
                URL.revokeObjectURL(previewImageUrl);
            }
        },
        [previewImageUrl],
    );

    React.useEffect(() => {
        setIsEditingCrop(false);
    }, [currentImageId]);

    React.useEffect(() => {
        if (!currentImage?.url || isEditingCrop || !currentCrop.area) {
            setPreviewImageUrl((previous) => {
                if (previous) {
                    URL.revokeObjectURL(previous);
                }
                return null;
            });
            return;
        }

        let active = true;

        createCroppedImageUrl(currentImage.url, currentCrop.area)
            .then((url) => {
                if (!active) {
                    URL.revokeObjectURL(url);
                    return;
                }

                setPreviewImageUrl((previous) => {
                    if (previous) {
                        URL.revokeObjectURL(previous);
                    }
                    return url;
                });
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setPreviewImageUrl((previous) => {
                    if (previous) {
                        URL.revokeObjectURL(previous);
                    }
                    return null;
                });
            });

        return () => {
            active = false;
        };
    }, [
        currentImage?.url,
        currentCrop.area?.x,
        currentCrop.area?.y,
        currentCrop.area?.width,
        currentCrop.area?.height,
        isEditingCrop,
    ]);

    React.useEffect(() => {
        if (!currentImage?.url) {
            setCurrentImageAspect(null);
            return;
        }

        let active = true;
        const image = new Image();
        image.onload = () => {
            if (!active) {
                return;
            }

            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                setCurrentImageAspect(image.naturalWidth / image.naturalHeight);
            } else {
                setCurrentImageAspect(null);
            }
        };
        image.onerror = () => {
            if (active) {
                setCurrentImageAspect(null);
            }
        };
        image.src = currentImage.url;

        return () => {
            active = false;
        };
    }, [currentImage?.url]);

    const cropperObjectFit: "horizontal-cover" | "vertical-cover" | null =
        currentImageAspect === null
            ? null
            : currentImageAspect >= 1
              ? "vertical-cover"
              : "horizontal-cover";

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
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
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

    const handleDeleteCurrentImage = async () => {
        if (!currentImage) {
            return;
        }

        const nextCropMap = { ...cropMap };
        delete nextCropMap[currentImage.id];
        onCropMapChange(nextCropMap);
        await onDeleteImage(currentImage.id);
    };

    const startCropEditing = () => {
        if (!currentImage || !cropperObjectFit) {
            return;
        }
        const crop = sanitizeCrop(cropMap[currentImage.id]);
        setDraftCrop({ x: crop.x, y: crop.y });
        setDraftZoom(crop.zoom);
        setDraftArea(crop.area);
        setIsEditingCrop(true);
    };

    const saveCrop = () => {
        if (!currentImage) {
            return;
        }

        onCropMapChange({
            ...cropMap,
            [currentImage.id]: {
                x: draftCrop.x,
                y: draftCrop.y,
                zoom: Math.min(Math.max(draftZoom, MIN_ZOOM), MAX_ZOOM),
                area: draftArea,
            },
        });
        setIsEditingCrop(false);
    };

    const cancelCropEditing = () => {
        if (!currentImage) {
            setIsEditingCrop(false);
            return;
        }

        const crop = sanitizeCrop(cropMap[currentImage.id]);
        setDraftCrop({ x: crop.x, y: crop.y });
        setDraftZoom(crop.zoom);
        setDraftArea(crop.area);
        setIsEditingCrop(false);
    };

    const resetCrop = () => {
        if (!currentImage) {
            return;
        }
        setDraftCrop({ x: 0, y: 0 });
        setDraftZoom(MIN_ZOOM);
        setDraftArea(undefined);
    };

    return (
        <div className="portrait-card">
            <div
                className={
                    "portrait-frame" +
                    (currentImage ? " has-image" : "") +
                    (isEditingCrop ? " is-crop-editing" : "")
                }
            >
                {!currentImage ? (
                    <span className="portrait-placeholder">{placeholder}</span>
                ) : !cropperObjectFit ? (
                    <img
                        src={currentImage.url}
                        alt=""
                        className="portrait-frame-image"
                        draggable={false}
                    />
                ) : !isEditingCrop && previewImageUrl ? (
                    <img
                        src={previewImageUrl}
                        alt=""
                        className="portrait-frame-cropped-image"
                        draggable={false}
                    />
                ) : isEditingCrop ? (
                    <Cropper
                        key={`${currentImage.id}-edit`}
                        image={currentImage.url}
                        crop={draftCrop}
                        zoom={draftZoom}
                        minZoom={MIN_ZOOM}
                        maxZoom={MAX_ZOOM}
                        aspect={1}
                        objectFit={cropperObjectFit}
                        restrictPosition
                        showGrid={false}
                        initialCroppedAreaPercentages={draftArea}
                        onCropChange={setDraftCrop}
                        onCropComplete={(croppedArea) =>
                            setDraftArea(sanitizeCropArea(croppedArea))
                        }
                        onZoomChange={setDraftZoom}
                    />
                ) : (
                    <Cropper
                        key={`${currentImage.id}-preview`}
                        image={currentImage.url}
                        crop={{ x: currentCrop.x, y: currentCrop.y }}
                        zoom={currentCrop.zoom}
                        minZoom={MIN_ZOOM}
                        maxZoom={MAX_ZOOM}
                        aspect={1}
                        objectFit={cropperObjectFit}
                        restrictPosition
                        showGrid={false}
                        onCropChange={NO_OP}
                        onZoomChange={NO_OP}
                        zoomWithScroll={false}
                        keyboardStep={0}
                    />
                )}
            </div>
            <div className="portrait-toolbar">
                <div className="portrait-gallery-nav">
                    <button
                        type="button"
                        className="gallery-nav-btn"
                        onClick={showPreviousImage}
                        disabled={!canCycleGallery || isEditingCrop}
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
                        disabled={!canCycleGallery || isEditingCrop}
                    >
                        <ChevronRightIcon size={14} />
                    </button>
                </div>
                <ActionDropdown
                    disabled={assetBusy || isEditingCrop}
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

            {isEditingCrop ? (
                <div className="portrait-crop-controls">
                    <label htmlFor="portrait-crop-zoom">Zoom</label>
                    <input
                        id="portrait-crop-zoom"
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={draftZoom}
                        onChange={(event) =>
                            setDraftZoom(Number(event.target.value))
                        }
                    />
                    <div className="portrait-crop-actions">
                        <Button variant="ghost" onClick={resetCrop}>
                            Reset
                        </Button>
                        <Button variant="ghost" onClick={cancelCropEditing}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={saveCrop}>
                            Done
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
