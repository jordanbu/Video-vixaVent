# Packaging Craft

Use this guide after the sequence is chosen, to package it: motion, transitions, text, sound, framing, color, and source quality. Values are defaults for social reels and highlights; the user's brief overrides them.

## 1. Shots and cuts

- The first 1–2 seconds carry the hook. Open on the strongest image, not on the start of the recording.
- Typical shot length is 0.8–3 seconds. Hold the payoff longer (2–4 seconds) so it lands.
- Cut on a beat or downbeat when music drives the edit (see `beat-sync-montage`), otherwise on a motion onset or an action completion.
- Drop dead footage before packaging: empty ground or sky, shaky tilt-downs, focus hunting, pocket or lens-cap frames.
- One continuous source shot can supply several shots. Two pieces of the same pan can bookend the edit: one as the hook, the rest as the payoff.

## 2. Camera motion

- Give static or slow shots a subtle push-in or pull-out with `scale` keyframes from 1.00 to 1.04–1.08 over the shot, eased. Alternate direction between neighboring shots so the motion reads as rhythm.
- Do not add motion to shots that already move fast.
- Every scale step enlarges the source (section 7). On low-resolution sources keep it at 1.05 or below.

## 3. Transitions

- Hard cuts are the default. Use one or two motivated transitions per 15 seconds:
  - whip pan for a reveal or a change of direction or energy, 6–12 frames;
  - cross-dissolve for time or place passing, 12–20 frames;
  - dip to black, or a fade-out on the last shot, for the ending.
- Pair a whip pan or flash with a short whoosh. Do not stack transitions on consecutive cuts.

## 4. Text

- Two to four words per title, one idea each. Show it for at least 1.3 seconds plus 0.25 seconds per word.
- Animate in and out: opacity 0→1 over 5–8 frames with scale 0.88→1 eased, and a 5–10 frame fade out.
- Size the font so the longest line fits within about 85 % of the canvas width. Text that touches the edges is clipped: verify with `view_timeline_frames`.
- Keep text inside the safe zone. In 9:16, stay clear of the bottom fifth and the right edge, where platform controls sit.
- Put each title on the shot it describes, on a video track above the footage. Never leave text after the last shot.

## 5. Sound

- Use separate audio tracks for music, ambience or production audio, and sound effects. Adds that collide on a track are moved to its end.
- Levels without speech: music 0.5–0.7, the clips' own ambience 0.2–0.4, sound effects 0.4–0.7. Under speech, music drops to 0.15–0.3.
- Keep sound effects sparse: a title hit, a transition. One per transition at most.
- Fade music in over 0.2–0.5 seconds and out over 1.5–2.5 seconds, ending with the picture.
- When the library has no fitting ambience, keep the clips' own audio low as the bed instead of muting it: wind, steps and room tone make the place feel real.

## 6. Framing and backgrounds

- Source aspect matches the canvas: use cover.
- Source aspect differs: for social output prefer `backgroundFill` (a blurred copy behind the clip) to black bars. Use cover only when the subject survives the crop; check frames.
- Never leave unintended black areas, including the tail of a fade or a gap between clips.

## 7. Color and quality

- Grade every shot with the same filter set so the edit reads as one piece. Stay near neutral (brightness 1.03–1.08, contrast 1.05–1.15, saturate 1.05–1.2) or use `inspect_color` / `auto_grade`. Filters use 1 = unchanged.
- Effective enlargement = fit × peak scale × peak zoom. The editor marks clips past 110 % (amber) and 150 % (red) with a ⚠ badge, and the export dialog repeats the warning.
- Past 150 %: tell the user the result will look soft, keep motion zoom subtle, and suggest the original file. Messaging apps recompress video; on WhatsApp, sending the file as a document keeps its resolution.
- Do not suggest exporting above the largest source's resolution: it adds size, not detail.

## 8. QA before reporting done

- Frames from every shot: no black, no clipped text, the subject readable.
- Total duration ends with the last shot; nothing was pushed to a track end.
- Music ends with the picture, levels follow section 5, sound effects sit where intended.
- Hook inside the first 2 seconds; payoff held.
- Report the source-quality limit honestly when clips are past 150 %.
