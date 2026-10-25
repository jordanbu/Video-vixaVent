import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  type Prompt,
} from '@modelcontextprotocol/sdk/types.js';

const PROMPTS: Prompt[] = [
  {
    name: 'create-short-video',
    description: 'Convierte el proyecto actual en un video vertical corto con ritmo ágil (gancho, desarrollo, clímax y cierre).',
    arguments: [{ name: 'topic', description: 'Tema o enfoque (opcional)', required: false }],
  },
  {
    name: 'transcribe-and-caption',
    description: 'Transcribe los clips de audio/video de la línea de tiempo y genera subtítulos (los clips sin audio se omiten).',
    arguments: [{ name: 'track', description: 'Alias de la pista; por defecto la pista de audio', required: false }],
  },
  {
    name: 'add-background-music',
    description: 'Elige y coloca música de fondo adecuada para la línea de tiempo actual y normaliza el volumen.',
    arguments: [{ name: 'mood', description: 'Estado de ánimo (opcional)', required: false }],
  },
  {
    name: 'generate-script',
    description: 'Escribe una narración o guion a partir de la media actual y planifica las tomas.',
    arguments: [{ name: 'topic', description: 'Tema', required: true }],
  },
  {
    name: 'export-project',
    description: 'Exporta el proyecto actual como video final (MP4) e informa el historial de exportaciones.',
    arguments: [{ name: 'format', description: 'mp4 / prores (por defecto mp4)', required: false }],
  },
  {
    name: 'clean-up-draft',
    description: 'Revisa la línea de tiempo: quita muletillas y pausas en silencio, y cierra los huecos.',
    arguments: [],
  },
];

const PROMPT_TEXT: Record<string, string> = {
  'create-short-video': 'Convierte la línea de tiempo actual en un video vertical corto con ritmo ágil: primero ordena la media y define el gancho, el desarrollo, el clímax y el cierre; después edita, agrega música y subtítulos, y haz la revisión previa a publicar. Tema: {topic}.',
  'transcribe-and-caption': 'Transcribe los clips de audio/video de la pista {track} y genera subtítulos; omite los clips sin audio y, al terminar, informa cuáles se omitieron.',
  'add-background-music': 'Elige y coloca música de fondo adecuada para la línea de tiempo actual, normalízala a unos -14 LUFS y asegúrate de que no tape la voz. {topic}',
  'export-project': 'Exporta el proyecto actual como video final (MP4 por defecto); antes de exportar revisa que la media esté completa y, al terminar, informa el historial de exportaciones y dónde quedó el archivo.',
  'clean-up-draft': 'Revisa la línea de tiempo actual: quita las muletillas de la voz, elimina las pausas en silencio y cierra los huecos, manteniendo los subtítulos sincronizados con la imagen.',
};

export function registerMcpPrompts(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    const topic = typeof args.topic === 'string' ? args.topic.trim() : '';
    const track = typeof args.track === 'string' ? args.track.trim() : '';
    const mood = typeof args.mood === 'string' ? args.mood.trim() : '';
    const template = name === 'generate-script'
      ? `Escribe una narración o guion sobre «${topic}»: primero define la estructura (gancho inicial, puntos principales y llamada a la acción final) y luego planifica las tomas acordes a la media.`
      : PROMPT_TEXT[name];
    if (!template) throw new Error(`Unknown prompt ${name}`);
    const text = template
      .replace(/\{topic\}/g, topic || 'la media actual')
      .replace(/\{track\}/g, track || 'A1');
    return {
      description: PROMPTS.find((prompt) => prompt.name === name)?.description,
      messages: [{
        role: 'user',
        content: { type: 'text', text: mood ? `${text} (estado de ánimo: ${mood})` : text },
      }],
    };
  });
}
