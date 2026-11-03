import assert from 'node:assert/strict';
import { DESIGN_STYLE_PRESETS } from '../../editor/design-presets';
import {
  localizeDesignFontRole,
  localizeDesignPresetName,
  localizeDesignRole,
  localizeDesignStyleGuide,
} from './designStyleLocalization';

const modern = DESIGN_STYLE_PRESETS.find((preset) => preset.name === 'Modern Editorial');
assert.ok(modern, 'the test data should include Modern Editorial');

assert.equal(localizeDesignPresetName(modern.name, 'en'), modern.name);
assert.equal(localizeDesignRole('background-chart', 'en'), 'background-chart');
assert.equal(localizeDesignFontRole('accent', 'en'), 'accent');
assert.equal(localizeDesignStyleGuide(modern.style.styleGuide ?? '', 'en'), modern.style.styleGuide);

assert.equal(localizeDesignPresetName(modern.name, 'es'), 'Editorial moderno');
assert.equal(localizeDesignRole('background-chart', 'es'), 'fondo de gráfico');
assert.equal(localizeDesignFontRole('accent', 'es'), 'fuente de acento');
assert.equal(localizeDesignRole('accent', 'es'), 'acento');
assert.equal(localizeDesignRole('chart-warm-mid', 'es'), 'gráfico cálido medio');
assert.equal(localizeDesignFontRole('callout', 'es'), 'fuente destacada');
for (const preset of DESIGN_STYLE_PRESETS) {
  assert.notEqual(localizeDesignPresetName(preset.name, 'es'), preset.name, `${preset.name} needs a Spanish name`);
  assert.notEqual(
    localizeDesignStyleGuide(preset.style.styleGuide ?? '', 'es'),
    preset.style.styleGuide,
    `${preset.name} needs a Spanish guide`,
  );
}

console.log('design-style-localization.verify: preset names, roles and guides localize to Spanish and stay English in en');
