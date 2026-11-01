import { DESIGN_STYLE_PRESETS } from '../../editor/design-presets';
import type { Locale } from '../../i18n/locale';
import { FONT_ROLE_ES, PRESET_GUIDE_ES, PRESET_NAME_ES, ROLE_ES } from './designStyleLocalizationEs';

const GUIDE_ES_BY_SOURCE = new Map(
  DESIGN_STYLE_PRESETS
    .filter((preset) => preset.style.styleGuide && PRESET_GUIDE_ES[preset.name])
    .map((preset) => [preset.style.styleGuide as string, PRESET_GUIDE_ES[preset.name]]),
);

export function localizeDesignPresetName(name: string, locale: Locale): string {
  return locale === 'es' ? (PRESET_NAME_ES[name] ?? name) : name;
}
export function localizeDesignRole(role: string, locale: Locale): string {
  return locale === 'es' ? (ROLE_ES[role] ?? role) : role;
}

export function localizeDesignFontRole(role: string, locale: Locale): string {
  return locale === 'es' ? (FONT_ROLE_ES[role] ?? role) : role;
}

export function localizeDesignStyleGuide(guide: string, locale: Locale): string {
  return locale === 'es' ? (GUIDE_ES_BY_SOURCE.get(guide) ?? guide) : guide;
}
