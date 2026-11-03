import assert from 'node:assert/strict';
import { hasMutationRoutingIntent, routedToolNames } from './tool-routing';

// Spanish requests preload the same tools as their English/Chinese equivalents, so the
// agent does not spend a turn searching for them.
const routed = (request: string) => routedToolNames(request.toLowerCase(), false);

assert.ok(routed('Quita los silencios y las muletillas del video').has('remove_silence'));
assert.ok(routed('Agrega subtítulos al video').has('edit_captions'));
assert.ok(routed('Exporta el proyecto en MP4').has('submit_export'));
assert.ok(routed('Pon música de fondo tranquila').has('add_audio'));
assert.ok(routed('Genera una imagen de un atardecer').has('submit_image'));
assert.ok(routed('Pásalo a vertical 9:16').has('set_aspect_ratio'));
assert.ok(routed('Transcribe la pista con el modelo local').has('transcribe_track'));
assert.ok(routed('Lee la transcripción').has('read_transcript'));
assert.ok(hasMutationRoutingIntent('recorta el segundo clip de la línea de tiempo'));

// Stems match at the start of a word, never in the middle of one.
assert.equal(routed('reimportar').has('import_media'), false, 'a stem never matches mid-word');

// English routing is unchanged.
assert.ok(routed('Remove the silence').has('remove_silence'));
assert.ok(routed('Quita los silencios y las pausas').has('remove_silence'));

console.log('tool-routing.verify: Spanish and English requests preload the matching tools');
