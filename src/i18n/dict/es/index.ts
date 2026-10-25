// ES dictionary assembly: one file per domain, mirroring the EN layout.
// key = Chinese original text, value = Spanish. Missing keys fall back to English.
import catalog from './catalog';
import audio from './audio';
import captions from './captions';
import chat from './chat';
import components from './components';
import editor from './editor';
import exportPanel from './exportPanel';
import extra from './extra';
import fx from './fx';
import library from './library';
import media from './media';
import review from './review';
import settings from './settings';
import settingsProviders from './settingsProviders';
import timeline from './timeline';
import topbar from './topbar';
import transcript from './transcript';

export const ES: Record<string, string> = Object.assign(
  {},
  catalog, audio, captions, chat, components, editor, exportPanel, extra, fx, library, media, review, settings, settingsProviders, timeline, topbar, transcript,
);
