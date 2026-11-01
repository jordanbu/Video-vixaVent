// Speech language a transcription uses when the user has not picked one in Settings →
// Transcription. The team speaks Spanish (specs/02-idioma-espanol.md); the inherited
// default was Chinese, so an unconfigured install transcribed Spanish audio as Chinese.
// Every provider and the settings sync read this one value.
export const DEFAULT_TRANSCRIPTION_LANGUAGE = 'es';
