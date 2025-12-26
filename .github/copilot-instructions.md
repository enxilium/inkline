# Project: Inkline - AI-Powered Storyteller Editor

## 1. Project Overview & Tech Stack

**Inkline** is a desktop application for authors, featuring rich text editing and local/cloud AI generation tools.

### Tech Stack

- **Core**: Electron, TypeScript
- **Frontend**: React, Zustand (State), **Tiptap** (Core Rich Text Editor)
- **Backend/Persistence**: Supabase (Auth, DB, Storage), Local JSON (Structure)
- **AI**: Gemini (API), ComfyUI (Local Edge AI - Parler-TTS, XTTS, Flux)

---

## 2. Architecture Map (Clean Architecture)

The project follows strict **Clean Architecture** principles. The dependency rule is paramount: **Source code dependencies must point only inward, toward higher-level policies.**

```
src/
├── @core/                      # THE INNER CIRCLE (Business Logic)
│   ├── domain/                 # Enterprise Business Rules
│   │   ├── entities/           # Pure Data Objects (e.g., Chapter, Character)
│   │   ├── repositories/       # Interfaces for data access (e.g., IChapterRepository)
│   │   └── services/           # Domain Services interfaces
│   └── application/            # Application Business Rules
│       ├── use-cases/          # Orchestrators (e.g., CreateChapter, GenerateImage)
│       ├── ports/              # Input/Output ports (if strict ports/adapters used)
│       └── daos/               # Data Access Objects (DTOs)
│
├── @infrastructure/            # THE OUTER CIRCLE (Frameworks & Drivers)
│   ├── db/                     # Supabase client, Local File System adapters
│   ├── ai/                     # OpenAI client, ComfyUI WebSocket client
│   └── logging/                # Logger implementations
│
├── @interface-adapters/        # THE GLUE (Controllers & Gateways)
│   ├── controllers/            # Handles IPC events, calls Use Cases
│   └── preload/                # Exposes safe API to Renderer
│
├── main/                       # Electron Main Process Entry Point
└── renderer/                   # React Frontend (Presentation Layer)
```

---

## 3. Rules of Engagement (Strict Enforcement)

### 🔴 @core/domain

- **ALLOWED**: Pure TypeScript.
- **FORBIDDEN**: `axios`, `fs`, `electron`, `react`, or any infrastructure libraries.
- **PURPOSE**: Define _what_ the app is (Entities) and _how_ we access data (Interfaces).
- **NOTE**: `ScrapNote` represents any additional files the user wants to create (e.g. world background, poems, clues) that aren't characters, locations, or chapters.

### 🟠 @core/application

- **ALLOWED**: Imports from `@core/domain`.
- **FORBIDDEN**: `axios`, `fs`, `electron`, UI libraries.
- **PURPOSE**: Orchestrate the flow of data. Contains specific business rules (e.g., "When a chapter is created, ensure it has a unique title").

### 🟡 @interface-adapters

- **ALLOWED**: Imports from `@core/application` and `@core/domain`. Electron `ipcMain`.
- **PURPOSE**: Receive input from the UI (via IPC), convert it to Use Case input, and return formatted results.

### 🟢 @infrastructure

- **ALLOWED**: Imports from `@core/application` and `@core/domain`. External libraries (`@supabase/supabase-js`, `axios`, `ws`).
- **PURPOSE**: Implement the interfaces defined in Domain. Talk to the outside world.

### 🔵 renderer

- **ALLOWED**: React, Zustand, **Tiptap** (Primary Editor).
- **FORBIDDEN**: Direct Node.js APIs (`fs`, `path`), Direct Electron imports (`ipcRenderer` - use `window.api`).
- **PURPOSE**: Display data and capture user intent.

### ⚪ Simplicity & IDs

- Keep every API/request DTO to the bare minimum fields needed for the use case. If a parameter can be derived (IDs, titles, storage paths), derive it instead of accepting it from callers.
- All generated IDs (chapters, assets, conversations, etc.) must be globally unique across projects so collisions can never occur, even between separate projects.
- Entities only store relationship identifiers. Never embed another entity or asset directly (e.g., prefer `character.voiceId`, `location.galleryImageIds`, `project.authorId`).

### 🟣 World Entities

- Characters track `currentLocationId`, `backgroundLocationId`, and a primary `organizationId`. Locations keep cached `characterIds` and `organizationIds` arrays; whenever a character or organization moves, is deleted, or is reassigned, these caches must be updated to stay in sync (e.g. `SaveCharacterInfo` and `SaveOrganizationInfo` must push/pull IDs on both sides).
- Organizations maintain their own `locationIds` array that lists every place they have a presence. Always validate that any referenced location belongs to the same project before saving, and clear both sides of the relationship when deleting.
- Deleting a character, location, or organization must also delete any gallery images, voices, BGMs, or playlists tied to that entity via `IAssetRepository`/`IStorageService` so no orphaned files remain.

### 📝 Behavioral Decisions

- `ChatMessage` objects purposely remain ID-less; ordering is derived solely from their position within a conversation and no per-message mutations are required.
- Chapter creation must accept the caller-provided insertion index so the UI can insert immediately after the focused chapter (e.g., splitting chapter 31 produces a new chapter 32 without an extra move step).
- Deleting a chapter should only decrement the order of chapters that followed it; there is no need to reindex unaffected chapters.
- Validation-heavy sanity checks inside use cases such as `SaveManuscriptStructure` can assume the repositories stay synchronized. The renderer constrains the possible operations, so duplicate-ID or range validations can be omitted unless a use case specifically requires them.
- Whenever a non-image asset (voice, BGM, playlist, etc.) is regenerated or imported for an entity, the previous asset must be deleted (including its storage object when applicable) before the new asset is persisted to avoid orphans.
- The renderer already prevents invalid asset-subject combinations and out-of-range editing requests, so server-side use cases can rely on those invariants unless stated otherwise.

---

## 4. Naming Conventions

| Type                 | Convention             | Example                                                                  |
| :------------------- | :--------------------- | :----------------------------------------------------------------------- |
| **Use Cases**        | Verb + Noun            | `CreateChapter.ts`, `GenerateCharacterVoice.ts`                          |
| **Entities**         | Noun (PascalCase)      | `Chapter.ts`, `UserPreferences.ts`                                       |
| **Interfaces**       | I + Noun               | `IChapterRepository.ts`, `IAudioGenerationService.ts`, `IAuthService.ts` |
| **Controllers**      | Noun + Controller      | `ManuscriptController.ts`                                                |
| **React Components** | PascalCase             | `ChapterEditor.tsx`                                                      |
| **Hooks**            | camelCase (use prefix) | `useAutosave.ts`                                                         |

---

## 5. Data & AI Strategy

### Persistence Strategy (Two-Tier)

1.  **Session State**: React (**Tiptap**) holds the "hot" state.
2.  **Application State**: Main Process holds the "Source of Truth" in-memory entities.
3.  **Persisted State**: Supabase is the final resting place.
    - **Autosave**: React (Debounce) -> IPC -> Main (Update Entity) -> Interval -> Use Case -> Supabase.

### AI Workflow

- **Do not** use generic `GenerateAsset` classes.
- **Voice Generation**:
    1.  `DesignCharacterVoice` (Parler-TTS) -> Returns reference audio buffer/path.
    2.  `GenerateCharacterDialogue` (XTTS) -> Uses reference to generate speech.
- **Storage**: Generated assets are uploaded to Supabase Storage; URLs are stored in Entities.

---

## 6. Development Workflow (How to add a feature)

**Scenario: Adding a "ScrapNote" to the Project.**

1.  **Domain**:
    - Create `ScrapNote` entity in `@core/domain/entities`.
    - Add `createScrapNote` method to `IProjectRepository` interface.

2.  **Application**:
    - Create `CreateScrapNote.ts` in `@core/application/use-cases/manuscript`.
    - Inject `IProjectRepository` into the constructor.
    - Implement logic: Validate input -> Call Repo -> Return Result.

3.  **Infrastructure**:
    - Implement `createScrapNote` in `SupabaseProjectRepository` (in `@infrastructure/db`).

4.  **Interface Adapters**:
    - Add `createScrapNote` handler in `ManuscriptController`.
    - Ensure `ipcMain.handle` is set up to call this controller method.

5.  **Preload**:
    - Expose `api.manuscript.createScrapNote` in `preload/index.ts`.

6.  **Renderer**:
    - Add wrapper function to appStore. 
    - Call appStore wrapper function from a React component or Zustand action.

At the end of every step, always run npx tsc to ensure type safety and correctness.