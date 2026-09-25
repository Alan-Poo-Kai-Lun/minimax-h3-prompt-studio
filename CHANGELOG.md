# MiniMax H3 Prompt Studio Changelog

**English** | [简体中文](CHANGELOG.zh-CN.md)

MiniMax H3 Prompt Studio has grown from a local prompt prototype into a multimodal H3 workstation with screenplay workflows, Hybrid generation, audio references, reusable Skills, prompt reverse-engineering, and multiple local AI backends.

## v0.8.18

- Improved long-text input performance by debouncing reference-chip and mention-highlight updates for the active editor only. Scrolling no longer rebuilds the complete highlight layer.
- Added reusable custom reverse-prompt instructions that can be saved, overwritten, deleted, and selected later, with built-in professional presets for image analysis and video shot breakdowns.
- Image and video reverse-engineering results are cached independently, so switching media modes no longer discards previous output.
- Fixed the main Generate button being incorrectly enabled after a targeted segment rewrite in the reverse workflow.
- Included saved reverse-prompt instructions in full backup export and restore.

## v0.8.17

- Added image prompt reverse-engineering for subjects, composition, camera, lighting, materials, style, and targeted negative prompts.
- Added video prompt reverse-engineering. The browser samples up to eight keyframes locally and can produce MiniMax H3 or generic video-model prompts.
- Reverse results support Chinese or English output, optional emphasis, preview, copy, and TXT download. Video analysis explicitly does not read or transcribe the original audio track.
- Reverse media is sent only to the AI backend configured by the user and reuses the existing model, endpoint, API key, temperature, and context settings.

## v0.8.16

- Fixed duplicate or empty H3 fields bypassing structural validation and failing during normalization. Raw output is now validated before automatic repair.
- Updated source build instructions and both README files to distinguish the current source version from the latest published portable release.

## v0.8.15

- Automatically repairs complete multi-segment H3 output when fields, segments, or `[Shot 1]` are missing instead of clearing the result during dialogue insertion.
- Repair retries up to twice while preserving approved screenplay dialogue, media labels, segment count, and timing.
- If repair still fails, the raw model output remains visible for inspection and the generation is clearly marked as failed.

## v0.8.14

- Added final custom-language validation for H3 output and automatic repair of untranslated prose.
- Language repair locks H3 field names, media labels, shot numbers, timestamps, relationship markers, and original dialogue.
- Rejects repairs that remain mixed-language or damage the H3 structure instead of saving them as successful output.

## v0.8.13

- Fixed custom-language screenplays that still contained English descriptions by checking `reference_plan`, `story_goal`, `scene`, `visual_action`, `camera_intent`, `sound`, transitions, and other prose line by line.
- Automatically retries one complete translation when English residue is detected; a second invalid result is rejected while the English master remains safe.
- Added an independent custom-language option and language-name field for H3 prompt output.
- Confirming a custom-language screenplay automatically selects the same H3 output language while still allowing manual changes.
- Custom H3 language settings are preserved in projects and full backups, with backward compatibility for older backups.

## v0.8.12

- Added an “English + custom language” bilingual screenplay mode supporting language names such as Bahasa Melayu, Japanese, and Thai.
- Generates one canonical English master, then translates it strictly to avoid two model calls creating different stories.
- The English master is read-only for comparison; the custom-language version remains editable and drives story review and H3 conversion.
- Translation must preserve segment numbers, field names, timing, timelines, Picture/Video/Audio labels, and verbatim dialogue or it is rejected.
- Added bilingual switching, copying, and downloading. Projects and full backups retain both versions and the selected custom language.
- Older full backups remain importable without the new fields.

## v0.8.11

- Added a large side-by-side screenplay comparison with line and changed-range highlighting, synchronized scrolling, change navigation, and editable revisions.
- Prevents applying stale suggestions after the original screenplay has changed; the original is never overwritten automatically.
- Added manual segment editing, targeted rewrite instructions for one selected segment, and undo for the latest change.
- Targeted rewrites preserve all untouched segments, original dialogue, and speaker labels; wrong segment numbers, multiple segments, or missing fields are rejected.
- Cancellation, failure, and project switching do not overwrite the previous result. Save, copy, and download use the updated result.

## v0.8.10

- Fixed templates applying only to Direct Prompt. Templates now apply visibly to the active workflow and focus the correct input.
- Applying a new template no longer keeps an unrelated approved screenplay locked; screenplay drafts are preserved rather than deleted.
- Added one-click export and import for templates, Skills, selected Skills, settings, generation parameters, and three-column layout.
- Imports are validated and confirmed first, library conflicts keep both records, repeated imports are deduplicated, and write failures roll back.
- API keys are excluded by default and can be included explicitly. Projects, history, and media remain separate project backups.
- Added browser restore tests and verified that selected Skill rules enter both screenplay and H3 generation requests.

## v0.8.9

- Added support for single-quoted, Chinese-quoted, and unquoted dialogue. Unparseable dialogue now reports an explicit error instead of being silently lost.
- Removes model-invented dialogue from silent segments and unifies character aliases only when they clearly identify the same reference person.
- Made custom-speaker processing idempotent, removing leftover speaker text and accumulating blank lines.
- Preserves mixed sound effects while cleaning music clauses and flags ambiguous descriptions for review.
- Timing checks now support minutes, clock notation, and timeline endpoints in unsegmented source scripts.
- Added edge-case regression coverage for all six self-check categories.

## v0.8.8

- Approved dialogue is restored to the matching shot time instead of being appended to the end of a segment; speaker IDs remain stable across shots and segments.
- Brand voiceovers and off-screen lines are marked as off-screen narration rather than requiring visible lip synchronization.
- Corrected `retention_analysis` by media type: Picture/Video use visual relationship markers and Audio uses audio relationship markers, scoped to actual shot references.
- Background music appears only in `non_diegetic_music` and is removed from duplicate `overall_soundscape` descriptions.
- Added a source-script versus generation-duration check, preventing conversions such as a 30-second source configured as 3 × 15 seconds.
- Added a full advertising screenplay regression test for timing, speakers, narration, media relationships, music separation, and duration conflicts.

## v0.8.7

- The approved screenplay is now the only story source for final H3 conversion. The model may not invent plot beats, dialogue, thought bubbles, slogans, props, or product claims.
- Dialogue-language descriptions are normalized to H3 English labels, for example Malaysian colloquial Malay becomes `[Malay]`.
- Generated rewrites, duplicates, and extra dialogue are removed before restoring the exact approved sentence once in the correct segment and speaker.
- Automatically normalizes abbreviated or invalid `retention_analysis` into shot ranges, fixed relationship markers, and descriptions.

## v0.8.6

- Fixed approved screenplay dialogue being omitted from final H3 prompts.
- Builds a mandatory per-segment dialogue manifest before conversion, preserving original language, exact wording, and speaker.
- Post-generation validation restores missing or paraphrased lines as `<d>[Language] exact words</d>` in the correct segment.
- Segments with dialogue explicitly require the speaker to remain visible with synchronized lip movement.
- Result status reports how many dialogue lines were restored automatically.

## v0.8.5

- Added Story Check to the screenplay workflow: Creative, Segmented Screenplay, Story Check, Human Approval, and H3 Prompt.
- Local rules check segment count and numbering, duration, unavailable Picture/Video/Audio labels, dialogue density, missing transitions, and repeated segments.
- An independent AI review audits causality, motivation, character/scene/prop continuity, pacing, transitions, and ending, returning a score, issue list, and complete revision.
- Story Check never overwrites the original automatically. Users must choose “Apply revision,” and later manual edits mark the review as outdated.
- Project save, load, export, and import retain story-review results and revisions.
- Added Story Check unit tests, English UI regression coverage, and project-restore verification.

## v0.8.4

- Hybrid no longer requires a first or last frame and can generate from reference images, Video, Audio, or any combination.
- Switching among T2VA, I2VA, FL2VA, L2VA, Ref2VA, and Hybrid no longer deletes media. Media unused by the active mode is excluded only from the current request.
- Video cards now include a player with audio, duration, resolution, file size, and a custom frame-capture time.
- Any video timestamp can be captured as the first frame, replacing the existing first-frame Picture or creating a new Picture.
- Audio cards now include playback, duration, file size, and purpose.
- Added real WebM/WAV regression tests for 0.40-second capture, preview metadata, and cross-mode media retention.

## v0.8.3

- Hybrid originally required a first-frame keyframe when Video or Audio references were used and rejected configurations with only a last frame.
- Switching to Hybrid automatically promoted the first non-last-frame image when no first frame existed.
- Old projects and workflows that added Video/Audio after images were also corrected automatically.
- Frontend guidance, backend validation, and generation constraints were kept consistent. This restriction was relaxed in v0.8.4.

## v0.8.2

- Unified the `@` media menu for independently numbered Picture, Video, and Audio references.
- Direct Prompt and Script inputs can insert and highlight `<Video N>` and `<Audio N>` labels, and clicking a chip locates the corresponding media.
- Video and audio upload areas support file selection, drag and drop, type filtering, and drag feedback.
- The quick Picture reference bar became a synchronized media reference bar.

## v0.8.1

- Direct Prompt and Script Workflow are displayed exclusively; confirming a screenplay automatically enters the Direct Prompt area.
- Hybrid supports up to three independently numbered Video references for edit source, continuation source, action/camera reference, and temporal structure.
- Video files, purposes, and descriptions are preserved with the project. Generation sends metadata only, not the source video file, to the AI backend.
- H3 generation and screenplay planning support `<Video N>` while keeping Picture, Video, and Audio numbering independent.
- Corrected the three-column sequence to 01 Creative Content, 02 Generation Mode, and 03 Canvas & Timing.

## v0.8.0

- Completed Chinese and English coverage for settings, screenplay, Skills, templates, references, and dynamic status areas.
- Converted History, Templates, and Skills into floating panels that no longer compress the three-column workspace.
- Added instant search, result counts, and Esc-to-close to all three managers.
- Added English regression checks for primary workflows and dynamic manager interfaces.

## v0.7.1

- Added mouse and keyboard resizing for all three columns.
- Column widths and focus state are saved and restored automatically.
- Each column supports focus mode and one-click return to the three-column view.
- Improved project controls, header actions, and model selection at 1366-pixel width.

## v0.7.0

- Rebuilt the desktop workspace into three columns: Prompt/Screenplay, Generation/References, and Result.
- Each column scrolls independently, reducing whole-page navigation through long forms.
- Narrow windows fall back automatically to two-column or single-column layouts.

## v0.6.1

### Reference ordering and clipboard workflow

- Reference cards can be freely reordered with clear before/after drop positions.
- Reordering synchronizes `<Picture N>` labels in creative content, screenplay, and generated output.
- `Ctrl+C` copies the selected reference image, while `Ctrl+V` replaces the selected Picture or creates a new one.
- System screenshots and clipboard images can be pasted directly.
- Added an explicit clipboard target state to reduce accidental image replacement.
- Improved Picture selection, highlighting, numbering, and operation feedback.

## v0.6.0

### Creative enhancement Skill system

- Added a user-managed creative Skill library with local `SKILL.md` import, create, edit, delete, select, and save operations.
- Up to three creative enhancement Skills can be active and are retained by project save/export.
- Bundled H3-compatible Skills: `abstract-expression-video-prompter`, `brand-promo-video-generator`, and `paper-collage-explainer-generator`.
- Custom Skills may enhance ideas, action, visuals, rhythm, and sound design only; `h3-prompt-writing` format rules remain highest priority.
- Prevents imported Skills from overriding H3 mode, Picture numbering, segmentation, or standard field structure.
- Added Skill-content validation and editable descriptions.

## v0.5.8

### H3 standard format corrections

- Aligned Ref2VA output with `h3-prompt-writing`: `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, and `non_diegetic_music`.
- Corrected `<Picture N>` / `<Subject N>` relationships, summary prefixes, retention markers, Shot labels, and timestamps.
- Made standard English the default H3 output while keeping Chinese as an optional nonstandard translation.

## v0.5.7

### Independent language controls

- Added independent screenplay-output and H3 prompt-output language controls with Chinese, English, and Follow Input options.
- Screenplay language, prompt-description language, and character-dialogue language can be configured separately.
- Dialogue may remain in Malay while the screenplay is Chinese or the H3 description is English.
- Technical labels such as `<Picture N>`, `<Subject N>`, `<Audio N>`, Shot, and timestamps retain their standard format.

## v0.5.3–v0.5.6

### Picture references, highlighting, and preview

- Added `@` Picture search, insertion, highlighting, quick chips, hover preview, full-image viewing, and reinsertion from the Picture chip.
- Added direct system screenshot and clipboard-image paste, plus selected-Picture replacement.
- Improved selected/reference styling, alignment, and overly strong yellow highlights.
- Fixed stale visible version labels.
- Introduced an exclusive port strategy from v0.5.5: use `8765` by default and automatically try `8766–8784` when an older version still owns the port, preventing a browser from reconnecting to an old background process.

## v0.5.2

### Unified VRAM release

- Added a unified `VRAM` release button that detects the active AI backend.
- Supports unloading the current Ollama model, the LM Studio native unload API, and llama.cpp Router unloading.
- Automatic VRAM release is available for backends that support unloading; unsupported OpenAI-compatible endpoints show a clear explanation.
- Unloading a model does not stop the AI service.

## v0.5.1

### Ollama VRAM management

- Added manual Ollama model unloading and an option to unload automatically after generation.
- Reduces VRAM conflicts when Ollama and ComfyUI run together.
- The model can load again automatically on the next generation request.

## v0.5.0

### Multiple AI backends

- Added backend selection for Ollama, LM Studio, llama.cpp Server, and OpenAI-compatible APIs.
- Added custom endpoint and optional API key support, connection testing, and model discovery.
- Added clear privacy guidance for offline and online-compatible endpoints.
- Made the changelog permanently accessible from the lower-left corner.
- Established the Windows portable build as the primary release format.

## v0.4.0–v0.4.2

### Hybrid, audio, and multimedia references

- Added `HYBRID` keyframe/reference-media mode, first and last keyframes, multiple full reference images, and audio reference management.
- Added ComfyUI-compatible `drive_audio`, `ref_audio`, and `final_audio` roles.
- Added `native`, `reference_only`, `lock_source`, and `remix_source` audio modes plus a primary-audio description.
- Added `@` Picture selection to screenplay and creative-content inputs.
- Expanded English coverage for dynamically generated UI and improved language switching.

## v0.3.0

### Screenplay workflow

- Added Direct Prompt and Screenplay Workflow modes.
- Added four screenplay stages: Creative Planning, Segmented Screenplay, Human Approval, and H3 Conversion.
- Supports editable screenplay generation before conversion to standard H3 structure.
- Added content type, target audience, language, pacing, segment count, and seconds-per-segment controls.
- Added complete screenplay copy/download and project persistence for screenplay content and workflow state.

## v0.2.0

### Complete workstation features

- Added streaming output, generation cancellation, and local-model multimodal capability detection.
- Added reference-image upload, Picture numbering, and character/product/scene/style roles.
- Added project create/save/import/export, generation history, template management, and configuration import/export.
- Templates support create, edit, replace, delete, and apply.
- Added light/dark themes, Chinese/English UI, custom Ollama endpoints, segmented result tabs, copy, and TXT download.
- Completed the Windows portable package.

## v0.1.0

### Core H3 generation modes

- Created the MiniMax H3 prompt-generation interface with T2VA, I2VA, FL2VA, L2VA, and Ref2VA.
- Added 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, and 21:9 aspect ratios.
- Added output width/height, segment count, and seconds-per-segment controls.
- Added basic reference validation for each mode and the local Ollama model/generation workflow.

## v0.0.0

### Initial prototype

- Built the first local MiniMax H3 Prompt Studio prototype with creative input, model selection, and result areas.
- Verified browser-to-Python service communication and local prompt generation through Ollama.
- Established the local-first direction: reference media is not proactively uploaded to the internet.
