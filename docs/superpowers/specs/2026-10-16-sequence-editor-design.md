# Sequence editor redesign

Date: 2026-10-16
Status: Approved design, pending spec review

## Problem

Sequence functions are edited in `ProjectFunctionModal` (`size="lg"`) via `SequenceStepsEditor`. Every DMX value of every step is its own block of three controls (fixture select, channel select by absolute address, value input), stacked vertically. With many fixtures and channels this yields hundreds or thousands of form rows in a modal: steps cannot be compared, nothing is grouped by fixture, and there is no bulk editing, copying, or live feedback.

## Goals

- Edit sequences with many fixtures, channels, and steps efficiently.
- Compare steps side by side.
- Program steps from the live universe (capture) and preview a step live.
- No backend, GraphQL, or schema change. The existing model `steps[].{fadeIn, hold, fadeOut, dmxValues[{channel, value}]}` stays as is.

## Non-goals

- Running the whole sequence with timing from the editor (Play/Stop).
- Backend channel ownership or release semantics in the DMX WebSocket protocol.
- Editing function types other than `Sequence`.
- Timeline or graph visualisation of fades.

## 1. Page and matrix

### Routing

- New routes: `/[locale]/project/[publicId]/functions/new` and `/[locale]/project/[publicId]/functions/[functionPublicId]`.
- The Functions tab keeps `ProjectFunctionTable`. "Add function" navigates to `.../functions/new`, and the edit icon navigates to `.../functions/[functionPublicId]`.
- `ProjectFunctionModal` and `SequenceStepsEditor` are removed once the page replaces them, including their specs and any orphaned i18n keys.
- The delete confirmation modal on the Functions tab stays unchanged.

### Header bar

- Name (text input), Direction (`forward` | `backward`), Run order (`loop` | `singleShot` | `pingPong`).
- Live toggle (section 2), capture counter with Store as step, Update step, and Clear (section 2).
- Save and Back.
- Save is explicit. It creates (`addProjectFunction`) or updates (`updateProjectFunction`) using the current mapping in `project-function-table.tsx`, which moves into a shared helper module. After creating, the page replaces the URL with the new function's `publicId`.
- Leaving the page with unsaved changes (Back, in-app navigation, tab close via `beforeunload`) asks for confirmation.
- Validation matches today's behaviour: the name is trimmed, and backend errors are shown as a red notification.

### Matrix layout

- Columns are steps, labelled "Step N".
- Three timing rows are pinned at the top: Fade in (ms), Hold (ms), Fade out (ms), as integers of at least 0.
- The remaining rows are channels, grouped under one collapsible header per patched fixture. Fixtures are ordered by `sortedSequenceFixtures` (start address, then `publicId`), and channels by `channelNumber`.
- Each fixture header shows the fixture name, its index `[n]`, and its DMX range, e.g. "PAR 1 [1] · DMX 1–8".
- Each channel row label shows the channel name and absolute address, e.g. "Red · 3".
- Channel values from steps that match no patched fixture are shown in a final "Unpatched" group with one row per absolute channel. They are kept on save.
- The label column and the timing rows stay fixed while the grid scrolls in both directions.
- Rows are virtualised so large patches stay responsive.

### Cells

- A cell is either empty (the step does not include the channel) or holds an integer from 0 to 255.
- Selecting a cell and typing digits starts editing. Enter or Tab commits, and Escape cancels. Values are clamped to 0–255, and invalid input reverts.
- Delete or Backspace on a selection empties the selected cells (removes those `dmxValues` entries). On timing cells it sets 0.
- Arrow keys move the selection, and Tab or Shift+Tab move horizontally.
- Shift+click or Shift+arrows extend a rectangular selection.
- Ctrl+Enter after typing a value fills every selected cell with it.
- Ctrl+C copies the selection as tab-separated text, with empty cells as empty strings. Ctrl+V pastes a tab-separated block at the anchor cell and clips it to the grid bounds.

### Step column actions

The column header menu offers Duplicate, Insert before, Insert after, and Delete. Columns can be dragged to reorder them, reusing `@dnd-kit/react` and `moveSequenceStep`. An "Add step" control after the last column appends an empty step.

### Filter

A text input filters channel rows by case-insensitive substring on the fixture or channel name. A fixture header stays visible if any of its rows match. Collapse and expand per fixture, plus "collapse all" and "expand all", are local UI state that is not persisted.

### Module structure

- `sequence-matrix.ts`: pure helpers. These build the row model from fixtures and steps (including unpatched rows), read and write a cell (`setCell(steps, stepIndex, channel, value | undefined)`), fill a rectangular selection, serialise and parse clipboard TSV, and duplicate or insert steps. Existing helpers in `sequence-steps.ts` are reused.
- `sequence-matrix.tsx`: grid component (rendering, selection, keyboard, clipboard).
- `sequence-editor-page.tsx`: page shell with header, data loading and saving, the unsaved-changes guard, and matrix composition.
- Route `page.tsx` files under the new routes.

## 2. Live preview and capture

### Constraints

- The `/dmx` WebSocket only supports absolute `set`, `functionStart`, and `functionStop`. There is no release or ownership.
- Fader moves in the popout console happen in a separate window and are invisible to the editor. Capture therefore watches the universe deltas received through the shared DMX store.

### Live toggle

- Live is disabled while no step column is selected. Deleting the selected step while Live is on switches Live off and restores.
- When Live is switched on, the editor snapshots the current universe values of every channel used by any step (the "restore set"). It then sends the selected step column with `setChannels`.
- While Live is on, any edit to the selected column, a change of selected column, or a structural change (a new channel enters the restore set) re-sends the selected column. A channel newly used by a step is added to the restore set with its value at that moment. A channel the selected step does not include is sent at its restore value.
- When Live is switched off, the editor writes the restore set back with `setChannels` and clears it. The same happens when the page unmounts.
- If the socket reconnects while Live is on, Live switches off and restores, then shows a notification.
- A red "LIVE" badge is shown in the header while Live is on.
- Known limitation: anything that changed restore-set channels during preview is overwritten on restore.

### Capture buffer

- While the page is mounted, every incoming delta on a channel of a patched fixture records that channel as touched. Only the channel number is stored, and the value is read from the store at capture time.
- Values the editor itself sends for Live are not recorded. The client compares each incoming delta against the last value the editor sent for that channel and ignores matches.
- The header shows the touched count with these actions:
  - Store as step appends a new step with every touched channel at its current universe value. Timing is copied from the selected step, or is 0/0/0 if there is none. The buffer is then cleared.
  - Update step merges the touched channels into the selected step, overwriting existing values, then clears the buffer. It is disabled when no step is selected.
  - Clear empties the buffer.
- While any function is running (`runningFunctionIds` is not empty), a warning next to the counter says that running functions also fill the capture buffer.

### Module structure

- `sequence-live-preview.ts`: pure helpers for the restore set and for computing the values to send.
- `use-sequence-live-preview.ts` and `use-sequence-capture.ts`: hooks over the existing DMX store and client.

## i18n

All new strings are added to `en.json` and `de.json` and sorted alphabetically. Keys orphaned by removing the modal and the old editor are removed. Run `nx run frontend:i18n-extract` and `nx run frontend:i18n-verify`.

## Testing

- Unit tests (Vitest) for `sequence-matrix.ts` (row model, unpatched rows, `setCell`, fill, TSV parse and serialise, duplicate and insert) and `sequence-live-preview.ts`.
- Component tests for the matrix: typing a value, Delete empties a cell, keyboard navigation, fill selection.
- Component tests for the page: load an existing function, save maps correctly to the GraphQL input, unsaved-changes guard.
- Hook tests for Live (snapshot, send, restore on toggle-off and unmount) and capture (records deltas, ignores its own sends, store and update step).
- Playwright e2e (mocked GraphQL): open the editor from the Functions tab, edit a cell, add a step, save.
- Done criteria per `AGENTS.md`: `nx run-many --targets typecheck,lint`, `nx run-many --targets test`, Prettier on changed files, harness health-check (new routes may require an `AGENTS.md` update).
