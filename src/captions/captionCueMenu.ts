import type { TranscriptWord } from '../transcript/types';
import type { CaptionsData } from './types';
import { updateManualCue } from './manualCaptions';

export const CAPTION_CUE_TRANSLATION_LANGS = [
  { label: 'English', flag: '🇺🇸' },
  // Japanese and Korean by their English names (specs/11): the label is also the translation target.
  { label: 'Japanese', flag: '🇯🇵' },
  { label: 'Korean', flag: '🇰🇷' },
  { label: 'Español', flag: '🇪🇸' },
  { label: 'Français', flag: '🇫🇷' },
  { label: 'Deutsch', flag: '🇩🇪' },
  { label: 'Português', flag: '🇵🇹' },
] as const;

// Projects saved before specs/11 stored the native names of Japanese and Korean as the translation
// target (escaped: no CJK in the source). Map them to the English names used now.
const LEGACY_CAPTION_LANGS: Readonly<Record<string, string>> = { '\u65e5\u672c\u8a9e': 'Japanese', '\ud55c\uad6d\uc5b4': 'Korean' };

export function normalizeCaptionLang(lang: string): string {
  return LEGACY_CAPTION_LANGS[lang] ?? lang;
}

export interface CaptionCueTextTarget {
  laneId: string;
  index: number;
  words: readonly TranscriptWord[];
}

export function captionCueText(target: CaptionCueTextTarget): string {
  return target.words[target.index]?.text.trim() ?? '';
}

export function replaceCaptionCueText(
  captions: CaptionsData,
  target: CaptionCueTextTarget,
  text: string,
): Partial<CaptionsData> | null {
  const cue = target.words[target.index];
  const clean = text.trim();
  if (!cue || !clean) return null;
  return updateManualCue(captions, target.laneId, target.index, clean, cue.start, cue.end);
}

export function captionCueAgentSeed(text: string): string {
  return text.trim();
}
