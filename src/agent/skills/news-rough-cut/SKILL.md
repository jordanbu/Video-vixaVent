---
name: news-rough-cut
description: Smart news rough cut — turn news footage into a complete, logically clear, tightly paced news short. Use when the user asks for a news rough cut, news editing, cutting news footage into a short video, a smart rough cut, or editing a news video (in Spanish: "corte de noticias", "editar la noticia", "resumen de noticia"), or provides news footage (press conference / interview / on-site / surveillance footage) to be cut into a factual news short. Never add music, voiceover, or sound effects.
---

# News Rough Cut

Rough-cut news footage into one news short with complete content, clear logic, and tight pacing. Stay faithful to the original footage, add no external sound, and keep an objective, formal, tight, clear informational news style.

This is an Vixaventora-native workflow. Use the current project's assets, transcript, word-level editing, timeline, and editing tools. Do not depend on external download or transcode pipelines.

## Workflow overview

1. **Analyze the footage completely** (required before editing): identify the news event, core topics, key people, important conclusions, and usable shots in the footage, then decide the editorial throughline and the final length. Check the footage section by section with `read_project`, `transcribe_track`, and `view_timeline_frames`.
2. **Topic analysis and length**: determine how many topics the footage contains and separate the core topic from secondary content.
3. **Content structure**: open directly with the most important news result / core conclusion / latest development / key on-site shot, with no build-up.
4. **Editing**: select by the keep/remove rules and cut speech at complete-meaning boundaries.
5. **Audio keeps only the original sound of the target news footage**: before editing, list as allowed sources only the news footage the user explicitly named/selected and its original on-site sound; when nothing was specified, use only the news shots and on-site sound already on the active timeline. BGM, sound effects, voiceover, narration, and any other unselected media in the media pool must never become allowed sources, even if they were already there.
6. **Final check**: play back section by section to confirm the facts are faithful, speech keeps its full meaning, and cut points join naturally.

## Topic analysis and length

- As a rule, one final video follows **one core news throughline**.
- If the footage has several independent topics, prefer the topic with **the highest news value, the most complete information, and the most usable footage**; **do not force unrelated topics** into the same video.
- The final length is not fixed; set it from:
  - the amount of information in the core news;
  - the length of usable speech;
  - the stage of the event and its latest developments;
  - the number of key on-site shots;
  - the time needed to keep the news meaning complete.
- With little information, **make the video shorter** instead of padding it with unrelated content; with a lot of information it can run longer, but **never cut speech short, drop key facts, or break the news logic just to shorten it**.

## Content structure

Open the video directly with the most important news result, core conclusion, latest development, or key on-site shot, with no long build-up. Organize the whole piece as:

1. What happened;
2. The latest developments so far;
3. The final result, consequences, or related responses.

If the news event is still ongoing, **end on the latest confirmed development**; never speculate about the outcome.

## What to keep

Prefer to keep:

- the core facts of the news event;
- time, place, people, and outcome of the event;
- the latest developments and official responses;
- statements by key people that carry real information;
- on-site, interview, press conference, and surveillance footage and other usable material;
- key shots that directly show how the event unfolded, its outcome, or its impact.

Everything you keep must serve the core news throughline.

## What to remove

Remove:

- ads and commercial promotion;
- program promos, channel branding, intros and outros;
- host small talk and links with no information;
- repeated statements and repeated shots;
- empty pauses, verbal fillers, and obvious dead air;
- long background unrelated to the core event;
- secondary content that does not affect understanding of the news;
- segments that cannot be verified, are ambiguous, or are easy to misread.

## Rules for cutting speech

- Speech must keep its **complete meaning**.
- Prefer to cut:
  - after a complete sentence ends;
  - at a natural pause by the speaker;
  - where the speech clearly changes direction;
  - at a natural shot transition.
- **Never** cut in the middle of a sentence, **never** keep only part of a statement so that its meaning changes, and **never** splice together statements from different times or contexts.
- If a statement is long, you may remove repeated, vague, or unrelated sentences, but what remains must **express a complete idea on its own**.
- Use the word-level editing tools (transcript) to delete and edit by word, so cuts land on complete sentence boundaries.

## Facts and logic

The edit must stay faithful to the original news footage. Never:

- change the original meaning of what someone said;
- exaggerate or downplay facts;
- link unrelated events;
- create a false cause-and-effect through shot splicing;
- present speculation as established fact;
- mislead viewers with shots that do not match the news event;
- remove necessary causes and consequences for the sake of pacing.

## Audio requirements

- **Do not add** any background music, voiceover, narration, sound effects, transition sounds, or other external sound.
- Keep only the voices and necessary on-site sound in the original footage that relate directly to the news.
- Remove ad music, program branding music, and sound unrelated to the core news.
- At cut points, keep the original voices joining naturally and avoid abrupt cuts, overlaps, pops, or obvious volume jumps (fine-tune cut points with `edit_item` fadeInSeconds/fadeOutSeconds; do not add music).

## Overall style

- Objective, formal, tight, clear informational news style.
- The news content sets the pacing; do not chase a fixed length or rapid cutting.
- Every kept segment must carry clear informational value; raise information density without losing completeness.
- Do not add decorative text, filters, or transition effects; a basic dissolve may soften a hard cut, but keep the news restraint.

## Vixaventora tools

- `read_project` / `read_timeline`: read the project and timeline state first and record the `sourceAssetId` and `src` of the allowed sources within the scope above; never list every media pool asset automatically.
- `transcribe_track` + word-level transcript editing: cut speech at complete-meaning boundaries and remove fillers/repetition.
- `view_timeline_frames`: check the shots and key on-site footage.
- `edit_item` (trim / ripple delete / fade) and `split_item` (split): edit by the keep/remove rules and smooth the cut points.
- `edit_track`: when multitrack cleanup is needed, create, adjust, or tighten the voice and on-site sound tracks.
- Before delivering, run `read_project` again to confirm every final `video` / `audio` item comes from an allowed source and there is no BGM, sound effect, voiceover, or narration; then use the preview/export pre-check to verify length and completeness.

## Reference files

- When producing the final cut, follow the fixed deterministic process and the mandatory acceptance checklist in [references/deterministic-execution-and-acceptance.md](references/deterministic-execution-and-acceptance.md): environment check → footage analysis → one edit plan → single-pass execution → item-by-item final acceptance (at least 1 video track clip, no external audio added in the final cut, speech meaning intact, natural cut points).
