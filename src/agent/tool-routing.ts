interface RoutingGroup {
  readonly requestKeywords?: readonly string[];
  readonly requestContext?: readonly (readonly string[])[];
  readonly mutating?: boolean;
  readonly tools: readonly string[];
}

const EDIT_VERBS = [
  'edit', 'add', 'insert', 'create', 'update', 'modify', 'adjust', 'apply', 'reorder',
  'delete', 'remove', 'trim', 'split', 'move', 'retime', 'slip',
  'edit*', 'agreg*', 'añad*', 'insert*', 'crea*', 'actualiz*', 'modific*', 'ajust*', 'aplic*', 'reorden*',
  'borr*', 'elimin*', 'quit*', 'recort*', 'divid*', 'cort*', 'mov*', 'muev*', 'desliz*', 'cambi*',
];
const EDIT_TARGETS = [
  'clip', 'item', 'track', 'timeline', 'sequence', 'title', 'text',
  'clip*', 'pista*', 'línea de tiempo', 'linea de tiempo', 'secuencia*', 'título*', 'titulo*', 'texto*',
];
const GENERATE_VERBS = [
  'generate', 'create', 'make', 'synthesize',
  'gener*', 'crea*', 'hac*', 'haz', 'sintetiz*', 'produc*',
];
const GENERATE_TARGETS = [
  'image', 'picture', 'photo', 'poster', 'video', 'music', 'sound', 'voiceover', 'shader',
  'imagen*', 'imágen*', 'foto*', 'póster', 'poster*', 'video*', 'vídeo*', 'música', 'musica*',
  'sonido*', 'locuci*', 'voz', 'shader*',
];

const ROUTING_GROUPS: readonly RoutingGroup[] = [
  {
    mutating: true,
    requestKeywords: [
      'trim', 'split', 'move clip', 'delete clip', 'remove clip', 'retime', 'slip edit',
      'background fill', 'blur background', 'edit timeline',
      'speed',
      'recort*', 'divid*', 'velocidad', 'relleno de fondo', 'desenfoc*',
    ],
    requestContext: [EDIT_VERBS, EDIT_TARGETS],
    tools: [
      'update_item_props', 'move_item', 'set_item_timing', 'duplicate_item', 'remove_item',
      'split_item', 'manage_timelines', 'edit_track', 'edit_item', 'undo_last_change',
      'redo_last_change', 'apply_layout',
    ],
  },
  {
    requestKeywords: [
      'aspect ratio', 'canvas ratio', 'vertical video', 'landscape video',
      'relación de aspecto', 'relacion de aspecto', 'vertical*', 'horizontal*', '9:16', '16:9',
    ],
    tools: ['set_aspect_ratio', 'apply_layout', 'auto_reframe'],
  },
  {
    requestContext: [
      ['elevenlabs', 'doubao', 'minimax', 'inworld', 'fish audio', 'fishaudio', 'speechify', 'openai', 'gemini', 'mistral', 'cartesia'],
      ['tts', 'text-to-speech', 'speech synthesis', 'voice generation', 'voiceover generation', 'locuci*', 'texto a voz', 'voz en off'],
    ],
    tools: ['submit_voice', 'track_progress', 'rerun_generation'],
  },
  {
    requestContext: [
      ['assemblyai', 'local', 'openai', 'mistral', 'deepgram', 'groq', 'elevenlabs', 'cartesia'],
      ['transcribe', 'transcription', 'speech-to-text', 'stt', 'asr', 'transcrib*', 'transcripci*'],
    ],
    tools: ['transcribe_track', 'read_transcript', 'find_transcript'],
  },
  {
    requestKeywords: ['caption', 'subtitle', 'captions', 'subtitles', 'Captions', 'subtítul*', 'subtitul*'],
    tools: [
      'read_captions', 'edit_captions', 'edit_item',
      'apply_caption_avoidance', 'place_graphics_in_safe_zone',
    ],
  },
  {
    requestKeywords: ['transcript', 'script', 'speech', 'transcripci*', 'guion*', 'guión', 'discurso*'],
    tools: [
      'read_transcript', 'find_transcript', 'clean_script', 'edit_gap', 'delete_text',
      'manage_transcript', 'read_script', 'apply_script',
    ],
  },
  {
    requestKeywords: ['silence', 'pause', 'filler word', 'silenci*', 'pausa*', 'muletilla*'],
    tools: ['read_transcript', 'find_transcript', 'clean_script', 'edit_gap', 'delete_text', 'remove_silence'],
  },
  {
    requestKeywords: [
      'audio', 'music', 'sound', 'loudness', 'bgm',
      'música', 'musica*', 'sonido*', 'volumen', 'canci*',
    ],
    tools: [
      'list_audio', 'add_audio', 'normalize_loudness', 'isolate_voice', 'detect_beats',
      'analyze_music', 'inspect_music', 'music_edit_plan', 'sync_cuts_to_music',
      'music_image_plan', 'sync_images_to_music',
    ],
  },
  {
    requestKeywords: [
      'library', 'template', 'effect', 'transition', 'zoom', 'lut', 'graphic', 'watermark',
      'animation',
      'biblioteca*', 'plantilla*', 'efecto*', 'transici*', 'gráfico*', 'grafico*', 'marca de agua', 'animaci*',
    ],
    tools: [
      'list_templates', 'search_templates', 'browse_library', 'manage_effects', 'manage_template',
      'update_watermark', 'search_fonts', 'add_motion_graphic', 'create_motion_graphic',
      'submit_motion_graphic', 'create_motion_graphic_from_code',
    ],
  },
  {
    requestContext: [GENERATE_VERBS, GENERATE_TARGETS],
    tools: [
      'submit_image', 'submit_voice', 'submit_sound', 'submit_music', 'submit_video',
      'submit_shader', 'submit_motion_graphic', 'track_progress', 'rerun_generation',
    ],
  },
  {
    requestKeywords: [
      'import', 'upload', 'download', 'media', 'asset', 'stock', 'copyright',
      'import*', 'subir', 'sube', 'descarg*', 'recurso*', 'archivo*', 'derechos de autor',
    ],
    tools: [
      'search_media', 'manage_media_pool', 'download_media', 'push_asset', 'import_url_asset',
      'search_stock_media', 'edit_asset', 'import_media', 'finalize_uploaded_asset',
      'request_asset_download', 'probe_media',
      'browse_local_media', 'import_asset', 'import_assets', 'import_folder',
    ],
  },
  {
    requestKeywords: [
      'publish', 'post to', 'post on', 'post it', 'share to', 'upload to', 'upload-post',
      'publica*', 'compart*', 'subir a', 'sube a', 'tiktok', 'instagram', 'youtube',
    ],
    tools: ['publish_to_social', 'track_social_publish', 'submit_render_job', 'track_export'],
  },
  {
    requestKeywords: [
      'export', 'render', 'xml', 'prores', 'premiere', 'resolve',
      'export*', 'render*', 'video final',
    ],
    tools: [
      'submit_export', 'submit_render_job', 'track_export', 'read_export_history',
      'verify_export', 'download_media', 'export_motion_graphic_prores',
    ],
  },
  {
    requestKeywords: [
      'project', 'sequence', 'version', 'marker', 'design style',
      'proyecto*', 'secuencia*', 'versi*', 'marcador*', 'estilo de diseño',
    ],
    tools: [
      'manage_timelines', 'manage_versions', 'manage_markers', 'manage_design_style', 'list_projects',
      'create_project', 'delete_project', 'restore_project', 'duplicate_project', 'edit_project',
      'target_project', 'get_editor_url',
    ],
  },
  {
    requestKeywords: [
      'scene', 'highlight', 'beat', 'downbeat', 'rhythm', 'multicam', 'reframe', 'color',
      'shot', 'analyze',
      'escena*', 'mejores momentos', 'ritmo*', 'pulso*', 'multicámara', 'multicamara', 'reencuadr*', 'color*', 'analiz*',
    ],
    tools: [
      'view_timeline_frames', 'view_asset_frames', 'detect_scenes', 'find_highlights', 'auto_reframe',
      'multicam_sync', 'change_cam', 'inspect_color', 'auto_grade', 'detect_beats', 'inspect_music',
      'music_image_plan', 'sync_images_to_music',
      'review_scene_plan',
    ],
  },
  {
    requestKeywords: [
      'web', 'search', 'crawl', 'website', 'skill', 'code',
      'busca*', 'sitio*', 'página*', 'pagina*', 'código', 'codigo*',
    ],
    tools: [
      'web_browser', 'web_search', 'web_map', 'web_crawl', 'web_batch_scrape', 'manage_skill',
      'install_skill', 'run_skill_script', 'run_code', 'search_fonts',
    ],
  },
];
const ROUTING_TERM_PATTERNS = new Map<string, RegExp>();

function routingTermPattern(term: string): RegExp | null {
  const cached = ROUTING_TERM_PATTERNS.get(term);
  if (cached) return cached;
  // Spanish stems end in "*" and match any word that starts with them
  // (recort* → recortar, recorta, recortes); accented letters count as letters.
  if (term.endsWith('*')) {
    const stem = term.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${stem}`, 'u');
    ROUTING_TERM_PATTERNS.set(term, pattern);
    return pattern;
  }
  if (!/^[a-z][a-z -]*$/.test(term)) return null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let body = escaped;
  if (!term.includes(' ')) {
    if (term.endsWith('e')) body = `${escaped.slice(0, -1)}(?:e|es|ed|ing)`;
    else if (term.endsWith('y')) body = `${escaped.slice(0, -1)}(?:y|ies|ied|ying)`;
    else body = `${escaped}(?:s|ed|ing)?`;
  }
  const pattern = new RegExp(`\\b${body}\\b`);
  ROUTING_TERM_PATTERNS.set(term, pattern);
  return pattern;
}

function requestHasRoutingTerm(request: string, term: string): boolean {
  const pattern = routingTermPattern(term);
  return pattern ? pattern.test(request) : request.includes(term);
}

function routingGroupMatches(group: RoutingGroup, request: string): boolean {
  const direct = group.requestKeywords?.some((term) => requestHasRoutingTerm(request, term)) ?? false;
  const contextual = group.requestContext?.every((alternatives) => (
    alternatives.some((term) => requestHasRoutingTerm(request, term))
  )) ?? false;
  return direct || contextual;
}

/** Shared positive mutation matcher for routing and read-only-hint disambiguation. */
export function hasMutationRoutingIntent(request: string): boolean {
  const normalized = request.toLowerCase();
  return ROUTING_GROUPS.some((group) => group.mutating && routingGroupMatches(group, normalized));
}


const MAX_ROUTING_GROUPS = 4;
export interface RoutedToolSelection {
  readonly names: ReadonlySet<string>;
  readonly matchedGroupCount: number;
  readonly overflow: boolean;
}


export function routedToolSelection(request: string, readOnly: boolean): RoutedToolSelection {
  const normalized = request.toLowerCase();
  const matching = ROUTING_GROUPS.filter((group) => (
    (!group.mutating || !readOnly) && routingGroupMatches(group, normalized)
  ));
  const selected = matching.slice(0, MAX_ROUTING_GROUPS);
  return {
    names: new Set(selected.flatMap((group) => group.tools)),
    matchedGroupCount: matching.length,
    overflow: matching.length > MAX_ROUTING_GROUPS,
  };
}

export function routedToolNames(request: string, readOnly: boolean): ReadonlySet<string> {
  return routedToolSelection(request, readOnly).names;
}
