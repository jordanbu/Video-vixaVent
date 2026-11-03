# News Rough Cut — Deterministic Execution Template and Acceptance Checklist

> Vixaventora-native reference. It borrows the common practice of deterministic editing workflows in the industry (environment check → footage analysis → one deterministic edit plan → single-pass execution → mandatory acceptance).
> It follows this skill's SKILL.md rules: faithful to the original footage, no external sound added, speech cut at complete-meaning boundaries, restrained and objective news style.

## 1. Execution order (fixed sequence, do not skip steps)

1. **Environment and footage check (prerequisite, required)**
   - Use `read_project` / `read_timeline` to confirm the current project and timeline exist and contain the target footage clips.
   - Build the allowed-source list: record only the `sourceAssetId` and `src` of the news footage the user explicitly named/selected and its original on-site sound; when nothing was specified, include only the news shots and on-site sound already on the active timeline. BGM, SFX, voiceover, narration, and any other unselected media in the media pool are never included.
   - Use `transcribe_track` to get a word-level transcript; if a track cannot be transcribed, fix media reachability first, then continue.
   - Use `view_timeline_frames` to check the key shots and footage content.
   - If the prerequisites fail → stop and report what is missing; never pretend it is done.

2. **Footage analysis and topic decision**
   - Identify: the news event / core topics / key people / important conclusions / usable shots.
   - Decide the number of topics: one final video follows one core news throughline; with several topics, pick the one with the highest news value, the most complete information, and the most usable footage.
   - Set the upper bound for the final length (driven by the amount of information and usable speech, not a rigid fixed value).

3. **Produce the edit plan (plan first, then act)**
   - Following the keep/remove rules, produce **one explicit edit plan**: the segments to keep (with sentence boundaries), the fillers/repetition/ads to remove, and the cut points to fine-tune.
   - Principles: open directly with the conclusion / latest development / key shot; cut speech only where a full sentence ends, at a natural pause, at a clear change of direction, or at a shot transition.
   - This step produces a "deterministic plan", not a request for the user to approve every step — the plan is formed in one go.

4. **Single-pass execution**
   - Apply trims, ripple deletes, and fades with `edit_item` batch updates/removals; call `split_item` when a clip needs splitting.
   - Speech cuts must land on complete sentence boundaries (guaranteed by the word-level transcript).
   - **Add no** BGM / narration / sound effects / transition sounds; never add `video` / `audio` from the media pool outside the allowed-source list, even if that asset existed before editing.

5. **Final acceptance (mandatory, see below)**
   - Run `read_project` again and compare the `sourceAssetId` / `src` of every final `video` / `audio` item with the allowed-source list; trims, splits, and moves of the same allowed source are valid, while any unselected source (including the sound carried by an added video) is not.
   - Play back section by section: faithful facts, complete speech meaning, natural cut points, no pops or abrupt cuts.

## 2. Mandatory acceptance checklist (every final cut, item by item)

| Check | Pass condition | On failure |
|---|---|---|
| The project exists and is readable | `read_project` returns the current active project | Stop and report why the project could not be read |
| At least 1 video track clip | The timeline has kept picture clips | Explain there is no usable footage; no final cut |
| Length matches the information | No unrelated content added to pad the length, and no speech/key facts cut to shorten it | Rebalance length and content |
| The core comes first | The first segment is the conclusion / latest development / key shot, with no long build-up | Adjust the opening |
| Speech meaning intact | Every kept statement expresses a complete idea on its own; nothing is "cut mid-sentence" | Fix the cut points |
| No external sound | Every final `video` / `audio` belongs to the allowed sources of user-selected news footage / original on-site sound; BGM, SFX, voiceover, or narration already in the media pool but not selected are not used either | Remove the clips from unselected sources and run the acceptance again |
| Cut points join | No abrupt cuts, overlaps, or obvious volume jumps; fine-tune with fadeInSeconds/fadeOutSeconds | Add a 1-2 frame fade in/out |
| Facts and logic | No change of meaning, no exaggeration or downplaying, no false links, no speculation as fact, no mismatched shots | Go back to the original footage and recut |

## 3. Tool mapping (same as SKILL.md)

- `read_project` / `read_timeline`, `transcribe_track`, `view_timeline_frames`, `edit_item` (trim / ripple delete / fade), `split_item`, `edit_track`.
- The "no added audio" check must compare the allowed-source list of selected footage built at the start with the final `read_project`; never use the whole media pool as the baseline, and never judge by the number of audio track clips.

## 4. Failure recovery

- If any acceptance item fails → go back to the "produce the edit plan" step and replan (not from scratch: locate the step that broke the rule).
- If the timeline was damaged, the project's undo/history may restore the state before execution, then run again.
- Only after every acceptance item passes, report "final cut done" with verifiable results such as the final length, the number of kept segments, and the number of cut points.
