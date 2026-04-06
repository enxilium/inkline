export const GUEST_USER_ID = "guest-local";
export const GUEST_EMAIL = "guest@local.inkline";
export const GUEST_DISPLAY_NAME = "Guest";

export type GuestTransitionDecision = "migrate" | "discard" | "cancel";

export const isGuestUserId = (value: string | null | undefined): boolean =>
    (value ?? "").trim() === GUEST_USER_ID;
