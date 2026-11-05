# Batch Audio Status Implementation Plan

> For agentic workers: use the executing-plans skill to implement this plan task-by-task.

Goal: Show saved/pending speech status for every entry and provide a one-click sequential generator for missing online TTS audio.

Architecture: A small pure audio-batch module selects missing audio and runs a sequential generation queue with progress and failure collection. app.mjs maps state and configured voices to UI labels, persists generated Blobs through the existing mutate path, and exposes the settings button. The Service Worker and module query versions advance together.

Tech Stack: Browser ES modules, IndexedDB, Web Speech API, existing remote TTS client, Node built-in test runner.

Spec: docs/superpowers/specs/2026-11-05-batch-audio-status-design.md

## Global Constraints

- Do not change the backup format, entry IDs, or IndexedDB schema.
- Do not generate audio automatically during import.
- Skip bundled audio and already stored audio.
- Continue after individual generation failures and preserve successful results.

## Review Focus

- No online TTS configured: the batch button is disabled and the status explains why.
- A failed remote request: later entries still generate and the failed entry remains pending.
- A repeated click after partial success: stored audio is skipped and only remaining entries are requested.
- Mobile cache: the new HTML and versioned modules are precached by the new Service Worker shell.
- Mixed entry sources: bundled MP3s and uploaded/generated Blobs get distinct, accurate labels.

### Task 1: Batch queue logic

Files:
- Create: site/audio-batch.mjs
- Test: tests/audio-batch.test.mjs
- Modify: package.json

Interfaces:
- Produces pendingAudioEntries(entries, audioIds) and generateMissingAudio(entries, options).
- options accepts audioIds, async generate(text), async save(entry, blob), and optional onProgress(progress).

- [x] Write tests for pending selection, sequential save order, progress, and continue-on-error behavior.
- [x] Run node --test tests/audio-batch.test.mjs and observe the expected module-not-found failure.
- [x] Implement the minimal queue module.
- [x] Run the targeted test and then the full npm test suite.

### Task 2: Status and batch controls

Files:
- Modify: site/app.mjs
- Modify: site/index.html
- Modify: site/style.css
- Test: tests/startup.test.mjs

Interfaces:
- Uses the queue from Task 1 and existing remoteSpeech, mutate, and state.audioIds.
- Adds load-all-tts, tts-batch-status, and per-card audio status markup.

- [x] Add failing source-contract assertions for the new controls and audio labels.
- [x] Run the targeted test and observe failure.
- [x] Implement status mapping, progress UI, sequential persistence, and safe no-service behavior.
- [x] Run targeted tests and inspect the rendered HTML strings through static checks.

### Task 3: Cache version and release verification

Files:
- Modify: site/sw.js
- Modify: site/index.html
- Modify: site/app.mjs

- [x] Bump shell/module query versions so mobile clients fetch the new feature.
- [x] Run npm test, node --check for changed modules, and git diff --check.
- [x] Commit and push the release; verify the public Service Worker contains the new shell version.
