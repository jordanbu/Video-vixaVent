import { getPluginSkill } from './plugin-skills';
import type { SkillDefinition } from './skill-types';

interface CreativeSkillMetadata {
  id: string;
  slug: string;
  name: string;
  nameZh: string;
  summary: string;
  scenarios: string[];
}

export const CREATIVE_SKILL_METADATA: CreativeSkillMetadata[] = [
  {
    id: '11111111-1240-4000-8000-000000000015',
    slug: 'livestream-to-clips',
    name: 'Livestream to Clips',
    nameZh: 'Livestream to clips',
    summary: 'Cut commerce, gaming, interview, teaching, entertainment, sports, music, or mixed livestream recordings into evidence-backed, publish-ready highlight clips.',
    scenarios: [
      'livestream-to-clips',
      'live-highlights',
      'stream-clips',
      'gaming-highlights',
      'commerce-clips',
      'clips-de-transmision'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000004',
    slug: 'long-video-to-shorts',
    name: 'Long Video to Shorts',
    nameZh: 'Long video to shorts',
    summary: 'Cut one long podcast, interview, course, or livestream into social-ready shorts and highlights.',
    scenarios: [
      'long-video-to-shorts',
      'reels',
      'tiktok',
      'shorts',
      'social-clips',
      'highlight-reel'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000012',
    slug: 'multi-clips-to-reels',
    name: 'Multi Clips to Reels',
    nameZh: 'Multiple clips to reels',
    summary: 'Turn product, event, travel, or gameplay footage into social-ready reels.',
    scenarios: [
      'multi-clips-to-reels',
      'multi-clips-to-shorts',
      'raw-clips',
      'reels',
      'tiktok',
      'shorts'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000005',
    slug: 'ai-cinematic-short-film',
    name: 'AI Cinematic Short Film',
    nameZh: 'AI cinematic short',
    summary: 'Plan and produce AI cinematic shorts — story, shots, prompts, continuity, and final checks.',
    scenarios: [
      'ai-film',
      'cinematic',
      'seedance',
      'story',
      'short-film',
      'video-generation'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000006',
    slug: 'product-ad-video-script',
    name: 'Product Ad Video Script',
    nameZh: 'Product ad script',
    summary: 'Turn a product or page into ad angles, hooks, storyboards, captions, CTAs, and visual direction.',
    scenarios: [
      'ad',
      'e-commerce',
      'landing-page',
      'marketing',
      'product',
      'script'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000011',
    slug: 'explainer-video',
    name: 'Explainer Video',
    nameZh: 'Explainer video',
    summary: 'Turn a topic, script, voiceover, product logic, or data into a complete explainer video.',
    scenarios: [
      'concept',
      'course',
      'data',
      'education',
      'explainer',
      'explainer-video'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000008',
    slug: 'motion-graphic-placement',
    name: 'Motion Graphic Placement',
    nameZh: 'Motion graphics placement',
    summary: 'Add motion graphics at the right moments — reinforcing the message without blocking content.',
    scenarios: [
      'creator-video',
      'interview',
      'lecture',
      'motion-graphic-placement',
      'motion-graphics',
      'podcast'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000009',
    slug: 'storyboard-shot-breakdown',
    name: 'Storyboard Shot Breakdown',
    nameZh: 'Shot breakdown storyboard',
    summary: 'Break down shot language shot by shot and generate storyboard reference images.',
    scenarios: [
      'cinematography',
      'director-logic',
      'film-analysis',
      'shot-analysis',
      'shot-breakdown',
      'storyboard'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000010',
    slug: 'video-thumbnail-generator',
    name: 'Video Thumbnail Generator',
    nameZh: 'Thumbnail generator',
    summary: 'Generate platform-ready thumbnails from the video content and real frames.',
    scenarios: [
      'bilibili-cover',
      'cover-image',
      'poster',
      'shorts-cover',
      'thumbnail',
      'video-cover'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000014',
    slug: 'news-rough-cut',
    name: 'News Rough Cut',
    nameZh: 'News rough cut',
    summary: 'Rough-cut news footage into a complete, clearly structured, tightly paced short news video, without adding any external sound.',
    scenarios: [
      'news-rough-cut',
      'news-cut',
      'edicion-de-noticias',
      'pre-edicion-de-noticias',
      'news footage',
      'rough-cut-news'
    ]
  },
  {
    id: '11111111-1240-4000-8000-000000000013',
    slug: 'skill-creator',
    name: 'Skill Creator',
    nameZh: 'Skill creator',
    summary: 'Turn a repeated workflow or idea into a reusable custom skill (SKILL.md) and install it in the local skills folder.',
    scenarios: [
      'create-skill',
      'skill-creator',
      'make-a-skill',
      'new-skill',
      'workflow-capture',
      'crear-skill',
      'escribir-skill',
      'flujo-a-skill'
    ]
  }
];

export const CREATIVE_SKILLS: SkillDefinition[] = CREATIVE_SKILL_METADATA.flatMap((metadata) => {
  const file = getPluginSkill(metadata.slug);
  if (!file) {
    if (typeof import.meta.env !== 'undefined') {
      throw new Error(`Creative skill metadata references missing SKILL.md: ${metadata.slug}`);
    }
    return [];
  }
  return [{
    ...metadata,
    description: file.description,
    body: file.body,
    files: file.files,
    source: 'builtin',
  }];
});

let customSkills: SkillDefinition[] = [];

export function setCustomSkills(list: SkillDefinition[]): void {
  customSkills = list;
}

/** Built-in then custom skills shown in the Creative Mode picker. */
export function allCreativeSkills(): SkillDefinition[] {
  return [...CREATIVE_SKILLS, ...customSkills];
}

export const findSkill = (id: string | null | undefined): SkillDefinition | undefined =>
  id ? (CREATIVE_SKILLS.find((skill) => skill.id === id) ?? customSkills.find((skill) => skill.id === id)) : undefined;
