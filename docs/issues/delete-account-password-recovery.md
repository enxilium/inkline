# Issue: Delete Account / Password Recovery Missing from UI

**Type:** Feature Gap / Bug  
**Area:** Authentication · Settings  
**Priority:** High

---

## Summary

Two essential account self-service actions are missing from the application UI:

1. **Password recovery** – `resetPassword(email)` is implemented in the infrastructure layer but is never reachable by the user.
2. **Account deletion** – no method exists anywhere in the codebase (interface, service, or UI) to let a user permanently delete their account.

---

## Current Behavior

### Settings › Account panel

The Account Management screen (`src/renderer/views/SettingsView.tsx`, around line 850) exposes:

| Action | Status |
|--------|--------|
| Update email | ✅ Working |
| Update password | ✅ Working |
| Log out | ✅ Working |
| **Forgot / recover password** | ❌ Not exposed in UI |
| **Delete account** | ❌ Not implemented anywhere |

### Auth layer gaps

`src/@core/domain/services/IAuthService.ts` declares:

```ts
resetPassword(email: string): Promise<void>;
```

This is implemented in `src/@infrastructure/db/SupabaseAuthService.ts` (lines 52–56) via `client.auth.resetPasswordForEmail(email)`, but no controller, IPC channel, preload binding, store action, or UI element calls it.

`deleteAccount` does not exist in `IAuthService`, `SupabaseAuthService`, any controller, or any UI surface.

---

## Expected Behavior

1. **Password recovery:** A "Forgot password?" link on the login screen (and/or a button in Settings › Account) should call `resetPassword(email)`, which sends a Supabase password-reset email to the user.
2. **Account deletion:** A clearly labelled "Delete Account" action in Settings › Account should permanently remove the user's data from Supabase (via `auth.admin.deleteUser` or the user-facing `rpc`) and log them out.

---

## Steps to Reproduce

1. Launch Inkline and log in.
2. Open **Settings › Account**.
3. Observe that there is no way to delete the account.
4. Log out and reach the login screen.
5. Observe that there is no "Forgot password?" / password recovery option.

---

## Affected Files

| File | Note |
|------|------|
| `src/@core/domain/services/IAuthService.ts` | Missing `deleteAccount(): Promise<void>` signature |
| `src/@infrastructure/db/SupabaseAuthService.ts` | `resetPassword` exists (lines 52–56) but needs a corresponding use-case + IPC wire-up; `deleteAccount` needs to be added |
| `src/@interface-adapters/controllers/AuthController.ts` | Needs handlers for both new actions |
| `src/renderer/views/SettingsView.tsx` | Needs Delete Account button (with confirmation dialog) and a way to trigger password recovery |
| Login screen component | Needs "Forgot password?" link |

---

## Proposed Fix

### Password recovery
1. Add `resetPasswordForEmail` IPC channel + preload binding.
2. Add a "Forgot password?" link to the login view that prompts for the user's email and calls the new channel.
3. Optionally, expose the same action in Settings › Account.

### Account deletion
1. Add `deleteAccount(): Promise<void>` to `IAuthService`.
2. Implement it in `SupabaseAuthService` (call `supabase.auth.admin.deleteUser(userId)` from the main process, or use a Supabase Edge Function for the user-facing flow).
3. Wire up an IPC channel, controller handler, and preload binding.
4. Add a "Delete Account" button in Settings › Account behind a confirmation dialog that warns the user all data will be lost.
5. On success, clear local state and navigate to the login screen.
